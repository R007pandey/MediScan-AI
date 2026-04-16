
import React from 'react';
import { PrescriptionData } from '../types';

interface StructuredViewProps {
  data: PrescriptionData;
}

const StructuredView: React.FC<StructuredViewProps> = ({ data }) => {
  const confidenceColors = {
    high: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    medium: 'bg-amber-50 text-amber-600 border border-amber-200',
    low: 'bg-red-50 text-red-600 border border-red-200'
  };

  return (
    <div className="space-y-8">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${confidenceColors[data.confidence]}`}>
            AI CONFIDENCE: {data.confidence}
          </span>
          {data.warnings.length > 0 && (
            <span className="flex items-center gap-2 text-amber-600 text-[10px] font-bold uppercase tracking-widest">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              Verification Required
            </span>
          )}
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest mb-4">Extraction Alerts</p>
          <ul className="space-y-2">
            {data.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700 text-sm">
                <span className="text-amber-500 mt-1">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-[#FF4D00] font-bold text-sm uppercase tracking-widest border-b border-slate-100 pb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Patient Profile
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Full Name</p>
              <p className="text-slate-900 font-semibold text-base">{data.patient_info.patient_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Prescription Date</p>
              <p className="text-slate-900 text-base">{data.patient_info.prescription_date || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Age</p>
              <p className="text-slate-900 text-base">{data.patient_info.age || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Gender</p>
              <p className="text-slate-900 text-base">{data.patient_info.gender || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Doctor Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-[#FF4D00] font-bold text-sm uppercase tracking-widest border-b border-slate-100 pb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Provider Details
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Practitioner</p>
              <p className="text-slate-900 font-semibold text-base">{data.doctor_info.doctor_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Facility</p>
              <p className="text-slate-900 text-base">{data.doctor_info.clinic_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Specialization</p>
              <p className="text-slate-900 text-base">{data.doctor_info.specialization || 'General Practitioner'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Validation</p>
              <div className="flex gap-2 mt-1">
                {data.doctor_info.doctor_signature_present && <span className="bg-[#FF4D00]/10 text-[#FF4D00] text-[9px] px-2 py-0.5 rounded-md font-bold border border-[#FF4D00]/20 uppercase">Signature</span>}
                {data.doctor_info.doctor_stamp_present && <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-md font-bold border border-slate-200 uppercase">Stamp</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medications Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 flex items-center gap-3 text-[#FF4D00] font-bold text-sm uppercase tracking-widest border-b border-slate-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.628.285a2 2 0 01-1.96 0l-.628-.285a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547l-1.16 1.16a2 2 0 000 2.828l1.16 1.16a2 2 0 001.022.547l2.387.477a6 6 0 003.86-.517l.628-.285a2 2 0 011.96 0l.628.285a6 6 0 003.86.517l2.387-.477a2 2 0 001.022-.547l1.16-1.16a2 2 0 000-2.828l-1.16-1.16z" /></svg>
          Prescribed Regimen
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Medication</th>
                <th className="px-6 py-4">Dosage</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.medical_info.medicines.length > 0 ? (
                data.medical_info.medicines.map((med, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900">{med.medicine_name}</td>
                    <td className="px-6 py-5 text-slate-700">{med.medicine_dosage}</td>
                    <td className="px-6 py-5 text-slate-700">{med.frequency}</td>
                    <td className="px-6 py-5 text-slate-700">{med.duration}</td>
                    <td className="px-6 py-5 text-slate-500 text-xs italic leading-relaxed">{med.instructions}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium italic">No medications detected in this extraction.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnosis Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-[#FF4D00] font-bold text-sm uppercase tracking-widest border-b border-slate-100 pb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Clinical Insights
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Primary Diagnosis</p>
              <p className="text-slate-900 font-semibold text-base leading-relaxed">{data.medical_info.diagnosis_primary || 'Not specified'}</p>
            </div>
            {data.medical_info.symptoms && data.medical_info.symptoms.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Symptoms Identified</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.medical_info.symptoms.map((s, i) => (
                    <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs border border-slate-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {data.medical_info.diagnostics_tests.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Prescribed Diagnostics</p>
                <ul className="space-y-2 mt-2">
                  {data.medical_info.diagnostics_tests.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
                      {t.test_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Notes Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-[#FF4D00] font-bold text-sm uppercase tracking-widest border-b border-slate-100 pb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Additional Context
          </div>
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
            {data.additional_notes || 'No supplementary instructions or notes were identified in this prescription.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructuredView;
