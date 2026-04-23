/**
 * Root index — the RootNavGuard in _layout.tsx handles all routing.
 * This file exists only to satisfy expo-router's requirement for an index
 * route; it renders nothing before the redirect fires.
 */
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 bg-[#0f172a] items-center justify-center">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
