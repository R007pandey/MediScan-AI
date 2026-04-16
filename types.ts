
export interface Medicine {
  medicine_name: string;
  medicine_dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface DiagnosticTest {
  test_name: string;
}

export interface PatientInfo {
  patient_name: string;
  age: number | string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  prescription_date: string | null;
}

export interface DoctorInfo {
  doctor_name: string;
  specialization: string | null;
  clinic_name: string;
  contact_info: string | null;
  doctor_signature_present: boolean;
  doctor_stamp_present: boolean;
}

export interface PrescriptionData {
  is_valid_prescription: boolean;
  rejection_reason: string | null;
  patient_info: PatientInfo;
  doctor_info: DoctorInfo;
  medical_info: {
    diagnosis_primary: string | null;
    symptoms: string[] | null;
    medicines: Medicine[];
    diagnostics_tests: DiagnosticTest[];
  };
  additional_notes: string | null;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: PrescriptionData;
  previewThumbnail?: string; // Base64 thumbnail or full image if small enough
}

export type InputMode = 'upload' | 'url';
export type OutputViewMode = 'structured' | 'json';
