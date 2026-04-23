/**
 * camera.tsx
 *
 * C1 — Camera viewfinder with tap-to-focus, flash, capture
 * C2 — Gallery picker (multi-select)
 * C3 — Multi-page capture: add more pages, reorder thumbnails, submit all
 * C5 — Compresses each image before upload (via imageUtils)
 * C4 — Edge detection: TODO (react-native-document-scanner-plugin)
 *
 * Flow: capture / pick → thumbnail strip → "Analyze N pages" → /result
 */

import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { compressAndEncode } from '../utils/imageUtils';
import { analyzePrescription } from '../services/geminiService';
import { analysisStore } from '../store/analysisStore';

const MAX_PAGES = 5; // mirrors backend MAX_FILES cap

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pages, setPages] = useState<string[]>([]); // local URIs

  // ─── permissions ────────────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f172a] items-center justify-center px-8">
        <Text className="text-5xl mb-6">📷</Text>
        <Text className="text-white text-xl font-bold mb-3 text-center">
          Camera permission needed
        </Text>
        <Text className="text-slate-400 text-sm text-center mb-8 leading-5">
          MediScan needs camera access to scan prescriptions.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 px-8 py-3 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── capture ─────────────────────────────────────────────────────────────────

  const handleCapture = async () => {
    if (!cameraRef.current || capturing || pages.length >= MAX_PAGES) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setPages((prev) => [...prev, photo.uri]);
      }
    } catch {
      Alert.alert('Capture failed', 'Could not take photo. Try again.');
    } finally {
      setCapturing(false);
    }
  };

  // ─── gallery ─────────────────────────────────────────────────────────────────

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PAGES - pages.length, // never exceed backend cap of 5
      quality: 1,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a: { uri: string }) => a.uri);
      setPages((prev) => [...prev, ...newUris].slice(0, MAX_PAGES));
    }
  };

  // ─── remove a page ────────────────────────────────────────────────────────────

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── analyze ─────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (pages.length === 0) return;
    setAnalyzing(true);
    try {
      // C5: compress each page
      const encoded = await Promise.all(pages.map(compressAndEncode));
      const files = encoded.map((f: { base64: string; mimeType: 'image/jpeg' }) => ({ base64: f.base64, mimeType: f.mimeType as string }));

      // D1: call the service
      const result = await analyzePrescription(files);

      // store result + metadata for the result screen
      analysisStore.setResult(result);
      analysisStore.setUris(encoded.map((e: { uri: string }) => e.uri));
      analysisStore.setFileCount(files.length);
      analysisStore.setViewMode('fresh');

      router.replace('/result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed.';
      Alert.alert('Analysis failed', msg, [{ text: 'OK' }]);
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-black">
      {/* Camera viewfinder */}
      <CameraView
        ref={cameraRef}
        className="flex-1"
        flash={flash}
        autofocus="on"
      />

      {/* Top bar */}
      <SafeAreaView
        edges={['top']}
        className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pt-2"
      >
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
          onPress={() => router.back()}
        >
          <Text className="text-white text-lg">✕</Text>
        </TouchableOpacity>

        <Text className="text-white font-semibold text-sm">
          {pages.length > 0
            ? `${pages.length} / ${MAX_PAGES} pages`
            : 'Align prescription in frame'}
        </Text>

        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
        >
          <Text className="text-lg">{flash === 'on' ? '⚡' : '🔦'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        {/* Thumbnail strip — shown when at least 1 page captured */}
        {pages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 mb-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {pages.map((uri, i) => (
              <View key={uri + i} className="relative">
                <Image
                  source={{ uri }}
                  className="w-16 h-20 rounded-lg border-2 border-white/40"
                  resizeMode="cover"
                />
                {/* Page number badge */}
                <View className="absolute top-1 left-1 bg-black/60 rounded px-1">
                  <Text className="text-white text-xs font-bold">{i + 1}</Text>
                </View>
                {/* Remove button */}
                <TouchableOpacity
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center"
                  onPress={() => removePage(i)}
                >
                  <Text className="text-white text-xs font-bold leading-none">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Main action row */}
        <View className="flex-row items-center justify-between px-8 pb-6 pt-2">
          {/* Gallery */}
          <TouchableOpacity
            className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center"
            onPress={handleGallery}
            disabled={analyzing}
          >
            <Text className="text-2xl">🖼</Text>
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            className="w-20 h-20 rounded-full bg-white items-center justify-center shadow-xl"
            onPress={handleCapture}
            disabled={capturing || analyzing || pages.length >= MAX_PAGES}
            activeOpacity={0.85}
          >
            {capturing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <View className="w-16 h-16 rounded-full border-4 border-slate-300" />
            )}
          </TouchableOpacity>

          {/* Analyze */}
          {pages.length > 0 ? (
            <TouchableOpacity
              className="bg-blue-600 rounded-xl px-3 py-2 items-center min-w-[64px]"
              onPress={handleAnalyze}
              disabled={analyzing}
              activeOpacity={0.85}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text className="text-white text-lg">🔍</Text>
                  <Text className="text-white text-xs font-semibold">
                    Analyze
                  </Text>
                  <Text className="text-blue-200 text-xs">{pages.length}p</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View className="w-16" />
          )}
        </View>
      </SafeAreaView>

      {/* Full-screen analyzing overlay */}
      {analyzing && (
        <View className="absolute inset-0 bg-black/75 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white text-base font-semibold mt-4">
            Analyzing {pages.length} {pages.length === 1 ? 'page' : 'pages'}…
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            This may take 10–20 seconds
          </Text>
        </View>
      )}
    </View>
  );
}
