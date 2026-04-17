/**
 * MediScan AI — Cloud Functions
 *
 * Why this exists: the Gemini API key must never ship to the client bundle.
 * This callable wraps the AI call so the key stays in the server runtime.
 *
 * Model: gemma-4-26b-a4b-it (Google Gemma 4, multimodal instruction-tuned)
 * Note: Gemma models don't support responseSchema / responseMimeType — the
 * JSON schema is embedded in the prompt and the response is parsed from text.
 *
 * Auth: callable enforces Firebase Auth via `request.auth`. Unauthed → 401.
 * Quota guard: 5 files max per request, ~10MB combined payload cap.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { GoogleGenAI } from "@google/genai";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MODEL = "gemma-4-26b-a4b-it";
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Prompt — the JSON schema is described inline because Gemma doesn't support
// the responseSchema config option that Gemini models provide.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert medical data extraction AI. Analyze the provided prescription image(s) and extract all information into a single JSON object matching the schema below.

RULES:
1. VALIDATION FIRST: Is this a medical prescription?
   - ACCEPT: prescriptions, handwritten medicine notes (common in India), discharge summaries, medical bills listing medicines.
   - REJECT: restaurant receipts, legal contracts, spreadsheets, random photos unrelated to healthcare.
   If rejected: set is_valid_prescription=false, fill rejection_reason, set all other fields to null.
2. Output ONLY the JSON object — no markdown, no code fences, no commentary.
3. Combine information across all provided images logically.
4. Use null for any field that is not visible or not applicable.
5. Extract every medicine listed: name, dosage, frequency, duration, instructions.
6. For handwritten prescriptions, do your best to interpret the handwriting.
7. confidence: "high" = clear text, "medium" = partially legible, "low" = mostly unclear.
8. warnings: list any fields that were unclear or potentially misread.

REQUIRED JSON SCHEMA:
{
  "is_valid_prescription": boolean,
  "rejection_reason": string | null,
  "patient_info": {
    "patient_name": string | null,
    "age": string | null,
    "gender": string | null,
    "prescription_date": string | null
  },
  "doctor_info": {
    "doctor_name": string | null,
    "specialization": string | null,
    "clinic_name": string | null,
    "contact_info": string | null,
    "doctor_signature_present": boolean | null,
    "doctor_stamp_present": boolean | null
  },
  "medical_info": {
    "diagnosis_primary": string | null,
    "symptoms": string[] | null,
    "medicines": [
      {
        "medicine_name": string,
        "medicine_dosage": string | null,
        "frequency": string | null,
        "duration": string | null,
        "instructions": string | null
      }
    ] | null,
    "diagnostics_tests": [{ "test_name": string }] | null
  },
  "additional_notes": string | null,
  "confidence": "high" | "medium" | "low" | null,
  "warnings": string[] | null
}

Respond with ONLY the JSON object. Do not wrap it in code fences or add any explanation.`;

// ---------------------------------------------------------------------------
// JSON extractor — handles cases where the model wraps output in code fences
// ---------------------------------------------------------------------------
function extractJson(text: string): string {
  const trimmed = text.trim();

  // Strip ```json ... ``` or ``` ... ``` wrappers if present
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find the outermost { ... } block
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

interface InputFile {
  base64: string;
  mimeType: string;
}

interface AnalyzeRequest {
  files: InputFile[];
}

export const analyzePrescription = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "512MiB" },
  async (request) => {
    // Auth gate
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to analyze prescriptions."
      );
    }

    const data = request.data as AnalyzeRequest;
    if (!data || !Array.isArray(data.files) || data.files.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Request must include a non-empty 'files' array."
      );
    }
    if (data.files.length > MAX_FILES) {
      throw new HttpsError(
        "invalid-argument",
        `Maximum ${MAX_FILES} files per request.`
      );
    }

    let totalBytes = 0;
    for (const f of data.files) {
      if (typeof f.base64 !== "string" || typeof f.mimeType !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "Each file must have 'base64' and 'mimeType' string fields."
        );
      }
      // base64 decoded size ≈ 3/4 of encoded length
      totalBytes += Math.ceil((f.base64.length * 3) / 4);
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        `Combined file size exceeds ${MAX_TOTAL_BYTES / (1024 * 1024)}MB.`
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    const imageParts = data.files.map((file) => ({
      inlineData: {
        data: file.base64,
        mimeType: file.mimeType,
      },
    }));

    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [...imageParts, { text: SYSTEM_PROMPT }],
          },
        ],
        // Note: Gemma models do not support responseMimeType / responseSchema.
        // JSON structure is enforced via the prompt instead.
      });
    } catch (err) {
      console.error("AI API error:", err);
      throw new HttpsError(
        "internal",
        "AI service is temporarily unavailable. Please try again."
      );
    }

    const rawText = response.text;
    if (!rawText) {
      throw new HttpsError("internal", "No response from AI model.");
    }

    const jsonText = extractJson(rawText);

    let parsed: { is_valid_prescription: boolean; rejection_reason?: string | null };
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error("JSON parse failure:", err, "\nRaw text:", rawText);
      throw new HttpsError(
        "internal",
        "Failed to parse the prescription data. The image might be too unclear."
      );
    }

    if (!parsed.is_valid_prescription) {
      throw new HttpsError(
        "failed-precondition",
        parsed.rejection_reason ||
          "The uploaded document does not appear to be a medical prescription."
      );
    }

    return parsed;
  }
);
