/**
 * history.tsx
 *
 * F1 — Firestore listener on users/{uid}/prescriptions, ordered by timestamp desc
 * F2 — Pull-to-refresh + empty state
 * F3 — Tap card → load into analysisStore (viewMode='history') → /result
 * F4 — Swipe-to-delete with confirm Alert
 * F5 — Skeleton loaders while first load is in flight
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import type { HistoryItem, PrescriptionData } from '../../types';
import { subscribeToPrescriptions, deletePrescription } from '../../services/firestoreService';
import { analysisStore } from '../../store/analysisStore';
import { useAuth } from '../../context/AuthContext';

const IS_DEV = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

// ─── confidence dot ───────────────────────────────────────────────────────────

function ConfidenceDot({ level }: { level: PrescriptionData['confidence'] }) {
  const color =
    level === 'high' ? '#22c55e' :
    level === 'medium' ? '#eab308' :
    level === 'low' ? '#ef4444' : '#475569';
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginTop: 4 }} />
  );
}

// ─── F5 skeleton card ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 mb-3 mx-5">
      <View className="flex-row justify-between mb-3">
        <View className="h-3 bg-slate-700 rounded w-32 animate-pulse" />
        <View className="h-3 bg-slate-700 rounded w-16 animate-pulse" />
      </View>
      <View className="h-3 bg-slate-700/60 rounded w-48 mb-2 animate-pulse" />
      <View className="h-3 bg-slate-700/40 rounded w-36 animate-pulse" />
    </View>
  );
}

// ─── history card ─────────────────────────────────────────────────────────────

function HistoryCard({
  item,
  onPress,
  onDelete,
}: {
  item: HistoryItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { data } = item;
  const topMed = data.medical_info.medicines?.[0]?.medicine_name;
  const doctorName = data.doctor_info.doctor_name;
  const date = data.patient_info.prescription_date
    ?? new Date(item.timestamp).toLocaleDateString('en-IN', {
         day: 'numeric', month: 'short', year: 'numeric',
       });
  const medCount = data.medical_info.medicines?.length ?? 0;

  return (
    <TouchableOpacity
      className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 mb-3 mx-5 active:opacity-80"
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {/* Date + confidence */}
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-slate-400 text-xs">{date}</Text>
            <ConfidenceDot level={data.confidence} />
          </View>

          {/* Doctor */}
          <Text className="text-white font-semibold text-sm mb-1" numberOfLines={1}>
            {doctorName ?? 'Unknown doctor'}
          </Text>

          {/* Medicines summary */}
          {topMed ? (
            <Text className="text-slate-400 text-xs" numberOfLines={1}>
              💊 {topMed}{medCount > 1 ? ` +${medCount - 1} more` : ''}
            </Text>
          ) : (
            <Text className="text-slate-600 text-xs">No medicines extracted</Text>
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity
          className="w-8 h-8 rounded-lg bg-red-900/30 items-center justify-center"
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-red-400 text-sm">🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems]         = useState<HistoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // F1 — subscribe to Firestore
  useEffect(() => {
    if (IS_DEV) {
      // DEV_MODE: no Firestore, show empty state immediately
      setLoading(false);
      return;
    }
    if (!user?.uid) return;

    const unsubscribe = subscribeToPrescriptions(
      user.uid,
      (data) => {
        setItems(data);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err) => {
        setError('Could not load history. Check your connection.');
        setLoading(false);
        setRefreshing(false);
        console.warn('History subscription error:', err);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  // F2 — pull-to-refresh (just re-triggers the subscription via state)
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The onSnapshot listener auto-updates; refreshing flag resets in the callback.
    // Add a safety timeout in case there's no data change.
    setTimeout(() => setRefreshing(false), 3000);
  }, []);

  // F3 — tap card → view result
  const handlePress = (item: HistoryItem) => {
    analysisStore.setResult(item.data);
    analysisStore.setFileCount(0);
    analysisStore.setViewMode('history');
    router.push('/result');
  };

  // F4 — delete with confirm
  const handleDelete = (item: HistoryItem) => {
    Alert.alert(
      'Delete prescription',
      'Remove this prescription from your history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await deletePrescription(user.uid, item.id);
              // onSnapshot will update the list automatically
            } catch {
              Alert.alert('Error', 'Could not delete. Try again.');
            }
          },
        },
      ]
    );
  };

  // ─── render states ────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold">History</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {items.length > 0 ? `${items.length} prescription${items.length !== 1 ? 's' : ''}` : 'Your scanned prescriptions'}
          </Text>
        </View>
        {items.length > 0 && (
          <View className="bg-blue-600 rounded-full px-2.5 py-0.5">
            <Text className="text-white text-xs font-bold">{items.length}</Text>
          </View>
        )}
      </View>

      {/* F5 skeleton */}
      {loading && (
        <View className="flex-1 pt-2">
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-slate-400 text-sm text-center">{error}</Text>
        </View>
      )}

      {/* DEV mode notice */}
      {IS_DEV && !loading && (
        <View className="mx-5 mb-4 bg-amber-900/30 border border-amber-700 rounded-xl p-3">
          <Text className="text-amber-400 text-xs text-center">
            ⚡ Dev mode — history is not persisted (Firestore writes skipped)
          </Text>
        </View>
      )}

      {/* F1 list / F2 pull-to-refresh / empty state */}
      {!loading && !error && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
          contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              onPress={() => handlePress(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-5xl mb-4">📋</Text>
              <Text className="text-white text-lg font-semibold mb-2 text-center">
                No prescriptions yet
              </Text>
              <Text className="text-slate-400 text-sm text-center leading-5">
                Scan your first prescription and it'll appear here.
              </Text>
              <TouchableOpacity
                className="mt-8 bg-blue-600 px-8 py-3 rounded-xl"
                onPress={() => router.push('/camera')}
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold">📷  Scan now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
