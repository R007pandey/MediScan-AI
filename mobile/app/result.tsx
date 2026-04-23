/**
 * result.tsx
 *
 * E1  — Structured result: patient / doctor / medicines / diagnostics / notes.
 * E2  — Medicine card component.
 * E3  — Auto-saves to Firestore on mount (fresh mode only, skipped in DEV_MODE).
 * E6  — Native share via system share sheet.
 *
 * viewMode 'fresh'   → came from camera, show "Scan another" CTA
 * viewMode 'history' → came from history list, show "← History" CTA, no re-save
 */

import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import type { PrescriptionData, Medicine } from '../types';
import { analysisStore } from '../store/analysisStore';
import { savePrescription } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

const IS_DEV = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

// ─── confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: PrescriptionData['confidence'] }) {
  const map = {
    high:   { bg: 'bg-green-900/50',  border: 'border-green-700',  text: 'text-green-300',  label: '● High confidence' },
    medium: { bg: 'bg-yellow-900/50', border: 'border-yellow-700', text: 'text-yellow-300', label: '◐ Medium confidence' },
    low:    { bg: 'bg-red-900/50',    border: 'border-red-700',    text: 'text-red-300',    label: '○ Low confidence' },
  };
  if (!level || !map[level]) return null;
  const s = map[level];
  return (
    <View className={`${s.bg} border ${s.border} rounded-lg px-3 py-1.5 self-start`}>
      <Text className={`${s.text} text-xs font-semibold`}>{s.label}</Text>
    </View>
  );
}

// ─── section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, emoji, children }: {
  title: string; emoji: string; children: React.ReactNode;
}) {
  return (
    <View className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 mb-4">
      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
        {emoji}  {title}
      </Text>
      {children}
    </View>
  );
}

// ─── info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-1.5 border-b border-slate-700/50">
      <Text className="text-slate-400 text-sm flex-1">{label}</Text>
      <Text className="text-white text-sm flex-1 text-right font-medium">{value}</Text>
    </View>
  );
}

// ─── E2 medicine card ─────────────────────────────────────────────────────────

function MedicineCard({ med, index }: { med: Medicine; index: number }) {
  return (
    <View className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
            <Text className="text-white text-xs font-bold">{index + 1}</Text>
          </View>
          <Text className="text-white font-semibold text-sm flex-1">{med.medicine_name}</Text>
        </View>
        {med.medicine_dosage && (
          <View className="bg-blue-900/50 border border-blue-700 rounded-lg px-2 py-0.5 ml-2">
            <Text className="text-blue-300 text-xs font-semibold">{med.medicine_dosage}</Text>
          </View>
        )}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {med.frequency    && <Chip icon="🕐" text={med.frequency} />}
        {med.duration     && <Chip icon="📅" text={med.duration} />}
        {med.instructions && <Chip icon="ℹ️" text={med.instructions} />}
      </View>
    </View>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center bg-slate-800 rounded-lg px-2 py-1 gap-1">
      <Text className="text-xs">{icon}</Text>
      <Text className="text-slate-300 text-xs">{text}</Text>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData]         = useState<PrescriptionData | null>(null);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const viewMode = useRef(analysisStore.getViewMode()).current;
  const hasSaved = useRef(false);

  // Load result from store
  useEffect(() => {
    const result = analysisStore.getResult();
    if (result) setData(result);
  }, []);

  // E3 — Auto-save on mount for fresh results (not for history view-only)
  useEffect(() => {
    if (!data || viewMode !== 'fresh' || hasSaved.current) return;
    if (IS_DEV) {
      // DEV_MODE: skip Firestore, just mark saved so UI doesn't show the indicator
      setSaved(true);
      return;
    }
    if (!user?.uid) return;

    hasSaved.current = true;
    savePrescription(user.uid, data, analysisStore.getFileCount())
      .then(() => setSaved(true))
      .catch((err) => {
        setSaveError('Could not save to history.');
        console.warn('Firestore save error:', err);
      });
  }, [data, user]);

  // E6 — Share as text
  const handleShare = async () => {
    if (!data) return;
    const meds = (data.medical_info.medicines ?? [])
      .map((m) => `• ${m.medicine_name}${m.medicine_dosage ? ` ${m.medicine_dosage}` : ''}`)
      .join('\n') || 'None listed';

    await Share.share({
      message: [
        '📋 MediScan AI — Prescription Summary',
        '',
        `Patient: ${data.patient_info.patient_name ?? '—'}`,
        `Doctor:  ${data.doctor_info.doctor_name ?? '—'}`,
        `Date:    ${data.patient_info.prescription_date ?? '—'}`,
        '',
        'Medicines:',
        meds,
        data.medical_info.diagnosis_primary
          ? `\nDiagnosis: ${data.medical_info.diagnosis_primary}` : '',
        '',
        '⚠️ AI-generated — verify with your doctor.',
      ].join('\n'),
    });
  };

  const handlePrimary = () => {
    analysisStore.clear();
    if (viewMode === 'history') {
      router.replace('/(tabs)/history');
    } else {
      router.replace('/camera');
    }
  };

  // ─── loading state ────────────────────────────────────────────────────────

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f172a] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 text-sm mt-4">Loading result…</Text>
      </SafeAreaView>
    );
  }

  const { patient_info, doctor_info, medical_info, additional_notes, confidence, warnings } = data;

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-blue-400 text-sm font-semibold">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-base">Prescription</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text className="text-blue-400 text-sm font-semibold">Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Confidence + save status row */}
        <View className="flex-row items-center justify-between mb-4">
          <ConfidenceBadge level={confidence} />
          {viewMode === 'fresh' && (
            <Text className="text-xs font-medium">
              {saved
                ? <Text className="text-green-400">✓ Saved</Text>
                : saveError
                  ? <Text className="text-red-400">⚠ {saveError}</Text>
                  : <Text className="text-slate-500">Saving…</Text>}
            </Text>
          )}
        </View>

        {/* Patient */}
        <SectionCard title="Patient" emoji="👤">
          <InfoRow label="Name"   value={patient_info.patient_name} />
          <InfoRow label="Age"    value={patient_info.age?.toString()} />
          <InfoRow label="Gender" value={patient_info.gender} />
          <InfoRow label="Date"   value={patient_info.prescription_date} />
          {!patient_info.patient_name && !patient_info.age && (
            <Text className="text-slate-500 text-sm">No patient info found.</Text>
          )}
        </SectionCard>

        {/* Doctor */}
        <SectionCard title="Doctor" emoji="🩺">
          <InfoRow label="Name"           value={doctor_info.doctor_name} />
          <InfoRow label="Specialization" value={doctor_info.specialization} />
          <InfoRow label="Clinic"         value={doctor_info.clinic_name} />
          <InfoRow label="Contact"        value={doctor_info.contact_info} />
          {doctor_info.doctor_signature_present != null && (
            <InfoRow label="Signature"
              value={doctor_info.doctor_signature_present ? 'Present ✓' : 'Not found'} />
          )}
          {!doctor_info.doctor_name && !doctor_info.clinic_name && (
            <Text className="text-slate-500 text-sm">No doctor info found.</Text>
          )}
        </SectionCard>

        {/* Diagnosis */}
        {(medical_info.diagnosis_primary || (medical_info.symptoms?.length ?? 0) > 0) && (
          <SectionCard title="Diagnosis" emoji="🔬">
            <InfoRow label="Primary" value={medical_info.diagnosis_primary} />
            {(medical_info.symptoms?.length ?? 0) > 0 && (
              <View className="mt-1">
                <Text className="text-slate-400 text-xs mb-1">Symptoms</Text>
                {medical_info.symptoms!.map((s, i) => (
                  <Text key={i} className="text-white text-sm py-0.5">• {s}</Text>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* Medicines */}
        <SectionCard title="Medicines" emoji="💊">
          {(medical_info.medicines?.length ?? 0) > 0
            ? medical_info.medicines!.map((med, i) => (
                <MedicineCard key={i} med={med} index={i} />
              ))
            : <Text className="text-slate-500 text-sm">No medicines found.</Text>}
        </SectionCard>

        {/* Diagnostics */}
        {(medical_info.diagnostics_tests?.length ?? 0) > 0 && (
          <SectionCard title="Tests Ordered" emoji="🧪">
            {medical_info.diagnostics_tests!.map((t, i) => (
              <View key={i} className="flex-row items-center py-1.5 border-b border-slate-700/50">
                <Text className="text-slate-400 text-sm mr-2">{i + 1}.</Text>
                <Text className="text-white text-sm">{t.test_name}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Notes */}
        {additional_notes && (
          <SectionCard title="Additional Notes" emoji="📝">
            <Text className="text-white text-sm leading-5">{additional_notes}</Text>
          </SectionCard>
        )}

        {/* Warnings */}
        {(warnings?.length ?? 0) > 0 && (
          <View className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-4 mb-4">
            <Text className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">
              ⚠️  Extraction warnings
            </Text>
            {warnings!.map((w, i) => (
              <Text key={i} className="text-yellow-300 text-sm py-0.5">• {w}</Text>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-4">
          <Text className="text-slate-400 text-xs text-center leading-5">
            ⚕️  AI-generated summary. Always verify with your doctor or pharmacist before taking medication.
          </Text>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          className="bg-blue-600 rounded-2xl py-4 items-center mb-3"
          onPress={handlePrimary}
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {viewMode === 'history' ? '← History' : '📷  Scan another'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#1e293b] border border-slate-700 rounded-2xl py-4 items-center"
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Text className="text-slate-300 font-semibold text-base">↗  Share summary</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
