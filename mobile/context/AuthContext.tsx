/**
 * AuthContext.tsx
 *
 * Manages Firebase auth state for the entire app.
 *
 * DEV_MODE (EXPO_PUBLIC_DEV_MODE=true):
 *   Skips Firebase Auth entirely. Returns a mock DEV_USER so screens can
 *   be tested without a Google account or OAuth setup.
 *
 * PROD_MODE:
 *   Listens to onAuthStateChanged. The sign-in screen calls
 *   signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
 *   after the expo-auth-session OAuth flow completes; this listener picks
 *   it up automatically.
 *
 * Session persistence (B2):
 *   Firebase JS SDK v12 does not export getReactNativePersistence from the
 *   standard entrypoint, so we use inMemoryPersistence for now. The session
 *   survives hot-reload but requires re-login on cold restart (non-issue in
 *   DEV_MODE). Proper persistence will be added in a future ticket via
 *   @react-native-firebase or a custom SecureStore token cache.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebase';

// ─── constants ────────────────────────────────────────────────────────────────

const IS_DEV = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

const DEV_USER = {
  uid: 'dev-user',
  email: 'dev@localhost',
  displayName: 'Dev User',
  photoURL: null,
} as unknown as User;

// ─── types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDevMode: boolean;
  signOut: () => Promise<void>;
}

// ─── context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // DEV_MODE: start with mock user; no loading spinner needed.
  const [user, setUser] = useState<User | null>(IS_DEV ? DEV_USER : null);
  const [loading, setLoading] = useState(!IS_DEV);

  useEffect(() => {
    if (IS_DEV) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    if (IS_DEV) {
      // In DEV_MODE let sign-out work so we can test the sign-in screen.
      setUser(null);
      return;
    }
    await fbSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDevMode: IS_DEV, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
