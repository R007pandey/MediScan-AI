
import { GoogleGenAI, Type } from "@google/genai";
import { PrescriptionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const prescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    is_valid_prescription: { type: Type.BOOLEAN, description: "True if the document is a medical prescription, lab report, or medical bill containing medicines. False if it is a non-medical invoice, contract, spreadsheet, random photo, or unrelated to healthcare." },
    rejection_reason: { type: Type.STRING, nullable: true, description: "If is_valid_prescription is false, explain why (e.g., 'This appears to be a restaurant receipt, not a medical prescription.'). Null if valid." },
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
          nullable: true
        },
        medicines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              medicine_name: { type: Type.STRING },
              medicine_dosage: { type: Type.STRING },
              frequency: { type: Type.STRING },
              duration: { type: Type.STRING },
              instructions: { type: Type.STRING },
            },
            required: ["medicine_name"]
          },
          nullable: true
        },
        diagnostics_tests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              test_name: { type: Type.STRING }
            }
          },
          nullable: true
        }
      }
    },
    additional_notes: { type: Type.STRING, nullable: true },
    confidence: { type: Type.STRING, description: "One of: high, medium, low", nullable: true },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      nullable: true
    }
  },
  required: ["is_valid_prescription"]
};

export async function analyzePrescription(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  const model = "gemini-3-flash-preview";

  const imageParts = files.map(file => ({
    inlineData: {
      data: file.base64,
      mimeType: file.mimeType,
    },
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: `You are an expert medical data extraction AI. Your task is to analyze documents (images or PDFs) and extract medical prescription information into a highly structured JSON format.

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
9. Do NOT include any text outside the JSON object in your response.`
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: prescriptionSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI model.");
  }

  try {
    const parsedData = JSON.parse(text) as PrescriptionData;
    
    if (!parsedData.is_valid_prescription) {
      throw new Error(parsedData.rejection_reason || "The uploaded document does not appear to be a medical prescription.");
    }
    
    return parsedData;
  } catch (err: any) {
    console.error("JSON Parsing/Validation Error:", err, text);
    // If it's our custom error, throw it directly
    if (err.message && err.message !== "Unexpected end of JSON input" && !err.message.includes("Unexpected token")) {
      throw err;
    }
    throw new Error("Failed to parse the prescription data. The image might be too unclear.");
  }
}
