
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  items: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

const HistoryList: React.FC<HistoryListProps> = ({ items, onSelectItem, onDeleteItem }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const patientName = item.data.patient_info.patient_name?.toLowerCase() || '';
        const doctorName = item.data.doctor_info.doctor_name?.toLowerCase() || '';
        const clinicName = item.data.doctor_info.clinic_name?.toLowerCase() || '';
        return patientName.includes(query) || doctorName.includes(query) || clinicName.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'name_asc':
          return (a.data.patient_info.patient_name || '').localeCompare(b.data.patient_info.patient_name || '');
        case 'name_desc':
          return (b.data.patient_info.patient_name || '').localeCompare(a.data.patient_info.patient_name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, sortBy]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-slate-400 space-y-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">No History Found</h3>
          <p className="text-sm text-slate-500">You haven't analyzed any prescriptions yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Extraction History</h2>
          <p className="text-sm text-slate-500 mt-1">Review and manage your previously analyzed prescriptions.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search by patient, doctor, or clinic..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30 transition-all shadow-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30 transition-all shadow-sm cursor-pointer"
          >
            <option value="newest">Date: Newest First</option>
            <option value="oldest">Date: Oldest First</option>
            <option value="name_asc">Patient Name: A-Z</option>
            <option value="name_desc">Patient Name: Z-A</option>
          </select>
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No results found for "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {filteredAndSortedItems.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  className="group relative bg-white border border-slate-200 hover:border-[#FF4D00]/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md flex flex-col"
                  onClick={() => onSelectItem(item)}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all bg-white rounded-lg border border-slate-200 shadow-sm z-10"
                    title="Delete record"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#FF4D00] flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-base font-bold text-slate-900 truncate">
                        {item.data.patient_info.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.data.doctor_info.doctor_name || 'Unknown Doctor'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        item.data.confidence === 'high' ? 'bg-emerald-500' : 
                        item.data.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {item.data.confidence} Conf.
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryList;

