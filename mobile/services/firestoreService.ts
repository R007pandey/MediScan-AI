/**
 * firestoreService.ts
 *
 * E3 — Save successful analyses to users/{uid}/prescriptions
 * F1 — Subscribe to the same collection for the history list
 * F4 — Delete a prescription by id
 *
 * Document shape (no original images — Firebase Storage deferred):
 * {
 *   data:       PrescriptionData   normalized result from Cloud Function
 *   timestamp:  Timestamp          server-side creation time
 *   fileCount:  number             how many pages were uploaded
 *   confidence: string | null      top-level confidence field for list preview
 *   uid:        string             owner's Firebase uid
 * }
 */

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PrescriptionData, HistoryItem } from '../types';

const prescriptionsRef = (uid: string) =>
  collection(db, 'users', uid, 'prescriptions');

// ─── E3: save ─────────────────────────────────────────────────────────────────

export async function savePrescription(
  uid: string,
  data: PrescriptionData,
  fileCount: number
): Promise<string> {
  const docRef = await addDoc(prescriptionsRef(uid), {
    data,
    timestamp: serverTimestamp(),
    fileCount,
    confidence: data.confidence ?? null,
    uid,
  });
  return docRef.id;
}

// ─── F1: subscribe ────────────────────────────────────────────────────────────

export function subscribeToPrescriptions(
  uid: string,
  onData: (items: HistoryItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(prescriptionsRef(uid), orderBy('timestamp', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: HistoryItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
        data: d.data().data as PrescriptionData,
      }));
      onData(items);
    },
    (err) => onError(err)
  );

  return unsubscribe;
}

// ─── F4: delete ───────────────────────────────────────────────────────────────

export async function deletePrescription(
  uid: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'prescriptions', id));
}
