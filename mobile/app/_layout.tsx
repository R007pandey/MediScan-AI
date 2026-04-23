import '../global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';

import { AuthProvider, useAuth } from '../context/AuthContext';

// Required for expo-auth-session on Android to dismiss the auth browser
WebBrowser.maybeCompleteAuthSession();

// ─── inner component (can call useAuth because it's inside AuthProvider) ──────

function RootNavGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const inSignIn = segments[0] === 'sign-in';

    if (!user && !inSignIn) {
      router.replace('/sign-in');
    } else if (user && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0f172a] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <Slot />;
}

// ─── root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <AuthProvider>
          <RootNavGuard />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
