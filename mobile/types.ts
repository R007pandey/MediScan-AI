// Shared types — keep in sync with ../types.ts (web)
// TODO: extract to packages/shared once monorepo is set up

export interface Medicine {
  medicine_name: string;
  medicine_dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface DiagnosticTest {
  test_name: string;
}

export interface PatientInfo {
  patient_name: string | null;
  age: number | string | null;
  gender: 'Male' | 'Female' | 'Other' | string | null;
  prescription_date: string | null;
}

export interface DoctorInfo {
  doctor_name: string | null;
  specialization: string | null;
  clinic_name: string | null;
  contact_info: string | null;
  doctor_signature_present: boolean | null;
  doctor_stamp_present: boolean | null;
}

export interface PrescriptionData {
  is_valid_prescription: boolean;
  rejection_reason: string | null;
  patient_info: PatientInfo;
  doctor_info: DoctorInfo;
  medical_info: {
    diagnosis_primary: string | null;
    symptoms: string[] | null;
    medicines: Medicine[] | null;
    diagnostics_tests: DiagnosticTest[] | null;
  };
  additional_notes: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  warnings: string[] | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: PrescriptionData;
}
