import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { user, isDevMode, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-xl font-bold">Settings</Text>
      </View>

      <View className="flex-1 px-5">
        {/* Account card */}
        <View className="bg-[#1e293b] rounded-2xl p-4 mb-4 border border-slate-700">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Account
          </Text>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mr-3">
              <Text className="text-white font-bold text-base">
                {user?.displayName?.[0] ?? 'U'}
              </Text>
            </View>
            <View>
              <Text className="text-white font-semibold text-sm">
                {isDevMode ? 'Dev User' : (user?.displayName ?? 'Unknown')}
              </Text>
              <Text className="text-slate-400 text-xs">
                {isDevMode ? 'dev@localhost' : (user?.email ?? '')}
              </Text>
            </View>
          </View>
        </View>

        {/* DEV mode indicator */}
        {isDevMode && (
          <View className="bg-amber-900/30 border border-amber-700 rounded-2xl p-3 mb-4">
            <Text className="text-amber-400 text-xs font-semibold text-center">
              ⚡ Dev mode active — auth is bypassed, data stays in memory
            </Text>
          </View>
        )}

        {/* App info */}
        <View className="bg-[#1e293b] rounded-2xl p-4 mb-4 border border-slate-700">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            App
          </Text>
          <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
          <Row label="Build" value="Epic B complete" />
          <Row label="Backend" value="Firebase us-central1" />
          <Row label="Model" value="Gemma 4 26B" />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          className="w-full bg-red-900/30 border border-red-800 rounded-2xl py-4 items-center mt-2"
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Text className="text-red-400 font-semibold text-sm">Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-slate-400 text-sm">{label}</Text>
      <Text className="text-slate-200 text-sm">{value}</Text>
    </View>
  );
}
