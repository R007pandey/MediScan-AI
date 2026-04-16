/**
 * Client-side wrapper for the `analyzePrescription` Cloud Function.
 *
 * The Gemini API key lives only on the server. This file used to call Gemini
 * directly, which inlined the key into the client bundle. It now calls a
 * Firebase callable function that does the work server-side.
 */

import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '../firebase';
import { PrescriptionData } from '../types';

interface AnalyzeRequest {
  files: { base64: string; mimeType: string }[];
}

const callAnalyze = httpsCallable<AnalyzeRequest, PrescriptionData>(
  functions,
  'analyzePrescription'
);

export async function analyzePrescription(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  try {
    const result = await callAnalyze({ files });
    return result.data;
  } catch (err) {
    // Firebase callable errors carry a `.message` we can surface cleanly.
    if (err instanceof Error) {
      const fnErr = err as FunctionsError;
      // `failed-precondition` = document was not a valid prescription
      // `unauthenticated` = signed-out user (shouldn't happen in normal flow)
      // `invalid-argument` = client sent bad payload
      // `internal` = server-side parse / Gemini failure
      throw new Error(fnErr.message || 'Failed to analyze prescription.');
    }
    throw new Error('An unexpected error occurred during analysis.');
  }
}
