
// ---------------------------------------------------------------------------
// Medicine — only medicine_name is guaranteed by the AI schema
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Gemini returns all patient/doctor fields as nullable
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PrescriptionData — the shape returned by the Cloud Function
// confidence and warnings are nullable (AI may omit them)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// HistoryItem — stored in Firestore, data is JSON-stringified PrescriptionData
// ---------------------------------------------------------------------------
export interface HistoryItem {
  id: string;
  timestamp: number;
  data: PrescriptionData;
}

export type InputMode = 'upload' | 'url';
export type OutputViewMode = 'structured' | 'json';
