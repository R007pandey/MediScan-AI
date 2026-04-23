import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { compressAndEncode } from '../../utils/imageUtils';
import { analyzePrescription } from '../../services/geminiService';
import { analysisStore } from '../../store/analysisStore';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

export default function ScanScreen() {
  const { user, isDevMode } = useAuth();
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);

  // Gallery shortcut — pick images without opening camera
  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow photo access in Settings to pick prescriptions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5, // mirrors backend MAX_FILES cap
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    setAnalyzing(true);
    try {
      const encoded = await Promise.all(result.assets.map((a: { uri: string }) => compressAndEncode(a.uri)));
      const files = encoded.map((f: { base64: string; mimeType: 'image/jpeg' }) => ({ base64: f.base64, mimeType: f.mimeType as string }));
      const data = await analyzePrescription(files);
      analysisStore.setResult(data);
      analysisStore.setUris(encoded.map((e: { uri: string }) => e.uri));
      analysisStore.setFileCount(files.length);
      analysisStore.setViewMode('fresh');
      router.push('/result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed.';
      Alert.alert('Analysis failed', msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold">MediScan AI</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {isDevMode ? '⚡ Dev mode' : (user?.displayName ?? '')}
          </Text>
        </View>
        <View className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center">
          <Text className="text-white text-base font-bold">
            {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        </View>
      </View>

      {/* Main CTA */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-28 h-28 rounded-3xl bg-[#1e293b] border-2 border-dashed border-slate-600 items-center justify-center mb-6">
          <Text className="text-5xl">📋</Text>
        </View>

        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Scan a Prescription
        </Text>
        <Text className="text-slate-400 text-sm text-center mb-10 leading-5">
          Point your camera at a prescription or{'\n'}pick from your gallery
        </Text>

        {/* Camera */}
        <TouchableOpacity
          className="w-full bg-blue-600 rounded-2xl py-4 items-center mb-3"
          activeOpacity={0.85}
          onPress={() => router.push('/camera')}
          disabled={analyzing}
        >
          <Text className="text-white font-semibold text-base">📷  Open Camera</Text>
        </TouchableOpacity>

        {/* Gallery */}
        <TouchableOpacity
          className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-4 items-center"
          activeOpacity={0.85}
          onPress={handleGallery}
          disabled={analyzing}
        >
          {analyzing ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#94a3b8" />
              <Text className="text-slate-300 font-semibold text-base">Analyzing…</Text>
            </View>
          ) : (
            <Text className="text-slate-300 font-semibold text-base">🖼  Choose from Gallery</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dev mode banner */}
      {isDevMode && (
        <View className="mx-5 mb-4 bg-amber-900/30 border border-amber-700 rounded-xl p-3">
          <Text className="text-amber-400 text-xs text-center">
            ⚡ Dev mode — Gemini called directly, data stays in memory
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
