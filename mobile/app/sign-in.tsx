/**
 * sign-in.tsx
 *
 * Google sign-in via expo-auth-session + Firebase signInWithCredential.
 *
 * To enable Google sign-in:
 *   1. Go to Firebase Console → Project → Authentication → Sign-in method
 *      → Enable Google.
 *   2. Go to Google Cloud Console → APIs & Services → Credentials.
 *      Copy the "Web client (auto created by Google Service)" client ID.
 *   3. Create an Android OAuth 2.0 client ID with your app's SHA-1.
 *      (debug SHA-1: run `cd android && ./gradlew signingReport`)
 *   4. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.local
 *      Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env.local
 *
 * DEV_MODE: the "Dev bypass" button skips all of this.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const IS_DEV = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function SignIn() {
  const { signOut, isDevMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle OAuth response — fires when user returns from Google's browser
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (!id_token) {
        setError('Google did not return an ID token. Check your OAuth client IDs.');
        setLoading(false);
        return;
      }
      setLoading(true);
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch((err) => {
          setError(err.message ?? 'Sign-in failed.');
          setLoading(false);
        });
      // Success case: onAuthStateChanged in AuthContext picks up the new user
      // and RootNavGuard redirects to /(tabs).
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Google OAuth error.');
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open sign-in.');
    } finally {
      setLoading(false);
    }
  };

  // DEV bypass — mirrors the web app's DEV_USER flow
  const handleDevBypass = async () => {
    // In DEV_MODE the AuthContext already has DEV_USER; calling signOut then
    // re-mount would reset it. Here we do nothing — the nav guard already
    // redirected to /(tabs) if IS_DEV. This button is shown when the user
    // explicitly signed out during a dev session.
    //
    // Re-mounting with DEV_USER: simplest path is to reload the context.
    // For now we navigate manually.
    const { router } = await import('expo-router');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo */}
        <View className="w-24 h-24 rounded-3xl bg-blue-600 items-center justify-center mb-8 shadow-lg">
          <Text className="text-5xl">⚕</Text>
        </View>

        {/* Heading */}
        <Text className="text-white text-3xl font-bold tracking-tight mb-2">
          MediScan AI
        </Text>
        <Text className="text-slate-400 text-base text-center mb-12">
          Scan prescriptions. Understand your medicines.
        </Text>

        {/* Google sign-in button */}
        <TouchableOpacity
          className="w-full bg-white rounded-xl py-4 flex-row items-center justify-center mb-4 shadow"
          onPress={handleGoogleSignIn}
          disabled={!request || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#1d4ed8" />
          ) : (
            <>
              <Text className="text-xl mr-3">🇬</Text>
              <Text className="text-slate-800 font-semibold text-base">
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View className="w-full bg-red-900/40 border border-red-700 rounded-xl p-3 mb-4">
            <Text className="text-red-300 text-sm text-center">{error}</Text>
            {!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && (
              <Text className="text-red-400 text-xs text-center mt-1">
                Tip: Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.local
              </Text>
            )}
          </View>
        )}

        {/* DEV bypass — only shown in dev mode */}
        {isDevMode && (
          <TouchableOpacity
            className="w-full border border-amber-600 rounded-xl py-3 flex-row items-center justify-center mt-2"
            onPress={handleDevBypass}
            activeOpacity={0.85}
          >
            <Text className="text-amber-400 font-medium text-sm">
              ⚡  Dev bypass (skip sign-in)
            </Text>
          </TouchableOpacity>
        )}

        {/* DEV mode banner */}
        {isDevMode && (
          <View className="mt-6 w-full bg-amber-900/30 border border-amber-700 rounded-xl p-3">
            <Text className="text-amber-400 text-xs text-center font-medium">
              DEV MODE — Google sign-in calls are active but EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
              may not be set. Use the bypass button to continue.
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <Text className="text-slate-600 text-xs text-center mt-10 leading-5">
          By continuing you agree to our Terms of Service.{'\n'}
          We never store prescription content outside your account.
        </Text>
      </View>
    </SafeAreaView>
  );
}
