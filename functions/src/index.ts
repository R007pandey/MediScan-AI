/**
 * MediScan AI — Cloud Functions
 *
 * Why this exists: the Gemini API key must never ship to the client bundle.
 * This callable wraps the Gemini call so the key stays in the server runtime.
 *
 * Auth: callable enforces Firebase Auth via `request.auth`. Unauthed → 401.
 * Quota guard: 5 files max per request, ~10MB combined payload cap.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { GoogleGenAI, Type } from "@google/genai";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MODEL = "gemini-2.5-flash";
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB

const prescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    is_valid_prescription: {
      type: Type.BOOLEAN,
      description:
        "True if the document is a medical prescription, lab report, or medical bill containing medicines. False if it is a non-medical invoice, contract, spreadsheet, random photo, or unrelated to healthcare.",
    },
    rejection_reason: {
      type: Type.STRING,
      nullable: true,
      description:
        "If is_valid_prescription is false, explain why. Null if valid.",
    },
    patient_info: {
      type: Type.OBJECT,
      properties: {
        patient_name: { type: Type.STRING, nullable: true },
        age: { type: Type.STRING, nullable: true },
        gender: { type: Type.STRING, nullable: true },
        prescription_date: { type: Type.STRING, nullable: true },
      },
    },
    doctor_info: {
      type: Type.OBJECT,
      properties: {
        doctor_name: { type: Type.STRING, nullable: true },
        specialization: { type: Type.STRING, nullable: true },
        clinic_name: { type: Type.STRING, nullable: true },
        contact_info: { type: Type.STRING, nullable: true },
        doctor_signature_present: { type: Type.BOOLEAN, nullable: true },
        doctor_stamp_present: { type: Type.BOOLEAN, nullable: true },
      },
    },
    medical_info: {
      type: Type.OBJECT,
      properties: {
        diagnosis_primary: { type: Type.STRING, nullable: true },
        symptoms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          nullable: true,
        },
        medicines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              medicine_name: { type: Type.STRING },
              medicine_dosage: { type: Type.STRING, nullable: true },
              frequency: { type: Type.STRING, nullable: true },
              duration: { type: Type.STRING, nullable: true },
              instructions: { type: Type.STRING, nullable: true },
            },
            required: ["medicine_name"],
          },
          nullable: true,
        },
        diagnostics_tests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              test_name: { type: Type.STRING },
            },
          },
          nullable: true,
        },
      },
    },
    additional_notes: { type: Type.STRING, nullable: true },
    confidence: {
      type: Type.STRING,
      description: "One of: high, medium, low",
      nullable: true,
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      nullable: true,
    },
  },
  required: ["is_valid_prescription"],
};

const SYSTEM_PROMPT = `You are an expert medical data extraction AI. Your task is to analyze documents (images or PDFs) and extract medical prescription information into a highly structured JSON format.

CRITICAL INSTRUCTIONS:
1. VALIDATION FIRST: Determine if the document is a medical prescription.
   - ACCEPT: Official prescriptions, handwritten notes on plain paper containing medicines/diagnoses (common in India), discharge summaries, or medical bills that list prescribed medicines.
   - REJECT: Non-medical invoices, legal contracts, spreadsheets, random photos, or documents completely unrelated to healthcare.
   If rejected, set "is_valid_prescription" to false, provide a "rejection_reason", and you may leave other fields null/empty.
2. Extract ALL visible information and return it ONLY as a valid JSON object.
3. If multiple pages or images are provided, combine the information logically.
4. If a field is not visible or not applicable, use null.
5. For medications, extract every single medicine listed including dosage, frequency, duration, and instructions.
6. For handwritten prescriptions, do your best to interpret the handwriting.
7. Set "confidence" to "high" if text is clear, "medium" if partially legible, "low" if mostly handwritten and unclear.
8. Add any unclear or potentially misread fields to the "warnings" array.
9. Do NOT include any text outside the JSON object in your response.`;

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
      // base64 decoded size ~= 3/4 of encoded length
      totalBytes += Math.ceil((f.base64.length * 3) / 4);
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        `Combined file size exceeds ${MAX_TOTAL_BYTES} bytes.`
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
        config: {
          responseMimeType: "application/json",
          responseSchema: prescriptionSchema,
        },
      });
    } catch (err) {
      console.error("Gemini API error:", err);
      throw new HttpsError(
        "internal",
        "AI service is temporarily unavailable. Please try again."
      );
    }

    const text = response.text;
    if (!text) {
      throw new HttpsError("internal", "No response from AI model.");
    }

    let parsed: { is_valid_prescription: boolean; rejection_reason?: string | null };
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON parse failure:", err, text);
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
