/**
 * geminiService.ts (mobile)
 *
 * Mobile always calls the Firebase Cloud Function — never Gemini directly.
 * Shipping a Gemini API key inside an APK is unsafe; the key lives only in
 * the Cloud Function runtime.
 *
 * EXPO_PUBLIC_DEV_MODE controls the auth bypass (mock user) only.
 * It does NOT change which backend is called — the Cloud Function is always used.
 *
 * Ticket 0.2: a 30-second client-side timeout wraps the callable so the UI
 * can never get stuck on an infinite spinner.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { PrescriptionData } from '../types';

const CALL_TIMEOUT_MS = 30_000;

// ─── typed callable ───────────────────────────────────────────────────────────

const callAnalyze = httpsCallable<
  { files: { base64: string; mimeType: string }[] },
  PrescriptionData
>(functions, 'analyzePrescription');

// ─── public export ────────────────────────────────────────────────────────────

export async function analyzePrescription(
  files: { base64: string; mimeType: string }[]
): Promise<PrescriptionData> {
  // Ticket 0.2: hard timeout — no infinite spinner under any condition
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Analysis timed out after 30 seconds. Please try again.')),
      CALL_TIMEOUT_MS
    )
  );

  try {
    const result = await Promise.race([callAnalyze({ files }), timeout]);
    return result.data;
  } catch (err) {
    // Surface Firebase HttpsError messages cleanly
    const msg =
      err instanceof Error
        ? err.message
        : 'Analysis failed. Please try again.';
    throw new Error(msg);
  }
}
