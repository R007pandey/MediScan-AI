/**
 * firebase.ts (mobile)
 *
 * Uses the same Firebase project as the web app.
 *
 * Emulator support (ticket 0.5):
 *   Set EXPO_PUBLIC_USE_EMULATOR=true in .env.local to route all traffic
 *   through the local Firebase emulator suite. Requires:
 *     firebase emulators:start --only auth,firestore,functions
 *   For the Functions emulator to call Gemini, add your key to:
 *     functions/.secret.local  →  GEMINI_API_KEY=your_key_here
 *
 * Auth persistence:
 *   Firebase JS SDK v12 doesn't export getReactNativePersistence from the
 *   standard entrypoint; inMemoryPersistence is used (sessions survive
 *   hot-reload, need re-login on cold restart — acceptable for MVP).
 */

import { getApps, initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  projectId: 'sixth-tribute-397805',
  appId: '1:304372140765:web:94af1143fc8f0de8376934',
  apiKey: 'AIzaSyDcG6qBMvjt6DD5Dpmjzyu31HlpKtfDotM',
  authDomain: 'sixth-tribute-397805.firebaseapp.com',
  storageBucket: 'sixth-tribute-397805.firebasestorage.app',
  messagingSenderId: '304372140765',
};

// Prevent double-init on hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initializeAuth throws if called twice; fall back to getAuth on re-render
let _auth;
try {
  _auth = initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;

export const db = getFirestore(app, 'ai-studio-fce26dcb-0fbb-4f28-b22a-1533575badc5');
export const functions = getFunctions(app, 'us-central1');

// ─── Emulator wiring (ticket 0.5) ─────────────────────────────────────────────
// Only active when EXPO_PUBLIC_USE_EMULATOR=true in .env.local.
// Never runs in production builds.

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';

if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://10.0.2.2:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '10.0.2.2', 8080);
  connectFunctionsEmulator(functions, '10.0.2.2', 5001);
  // Note: Android emulator uses 10.0.2.2 to reach the host machine's localhost.
  // For physical device on same network, replace with your machine's LAN IP.
}
