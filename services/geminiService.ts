/**
 * geminiService.ts
 *
 * PROD  — calls the Firebase Cloud Function `analyzePrescription` via
 *         httpsCallable. The Gemini key lives only on the server.
 *
 * DEV   — when VITE_DEV_MODE=true, calls Gemini directly from the client
 *         using VITE_GEMINI_API_KEY from .env.local.
 *         This path is intentionally tree-shaken out of production builds.
 */

import { PrescriptionData } from '../types';

const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true';

// ---------------------------------------------------------------------------
// Shared: JSON schema embedded in prompt (Gemma 4 doesn't support
// responseSchema, so we describe the shape in natural language)
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

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

// ---------------------------------------------------------------------------
// DEV path — direct Gemini call from client (key in .env.local)
// ---------------------------------------------------------------------------
async function analyzeViaDirect(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') {
    throw new Error(
      'Dev mode is on but VITE_GEMINI_API_KEY is not set in .env.local. Add your Gemini API key.'
    );
  }

  // Dynamic import keeps the @google/genai bundle out of prod
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const imageParts = files.map((f) => ({
    inlineData: { data: f.base64, mimeType: f.mimeType },
  }));

  const response = await ai.models.generateContent({
    model: 'gemma-4-26b-a4b-it',
    contents: [{ parts: [...imageParts, { text: SYSTEM_PROMPT }] }],
  });

  const rawText = response.text;
  if (!rawText) throw new Error('No response from AI model.');

  const parsed = JSON.parse(extractJson(rawText)) as PrescriptionData;

  if (!parsed.is_valid_prescription) {
    throw new Error(
      parsed.rejection_reason ??
      'The uploaded document does not appear to be a medical prescription.'
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// PROD path — Firebase Cloud Function (key stays server-side)
// ---------------------------------------------------------------------------
async function analyzeViaCloudFunction(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  const { httpsCallable } = await import('firebase/functions');
  const { functions } = await import('../firebase');

  const callAnalyze = httpsCallable<
    { files: { base64: string; mimeType: string }[] },
    PrescriptionData
  >(functions, 'analyzePrescription');

  try {
    const result = await callAnalyze({ files });
    return result.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to analyze prescription.';
    throw new Error(msg);
  }
}

// ---------------------------------------------------------------------------
// Public export — routes to the right path based on VITE_DEV_MODE
// ---------------------------------------------------------------------------
export async function analyzePrescription(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  return IS_DEV ? analyzeViaDirect(files) : analyzeViaCloudFunction(files);
}
