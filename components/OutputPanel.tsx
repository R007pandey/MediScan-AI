
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PrescriptionData, OutputViewMode } from '../types';
import StructuredView from './StructuredView';

interface OutputPanelProps {
  data: PrescriptionData | null;
  error: string | null;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ data, error }) => {
  const [viewMode, setViewMode] = useState<OutputViewMode>('structured');
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Analysis Failed</h3>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm font-bold text-[#FF4D00] uppercase tracking-widest hover:underline"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8">
        <div className="relative">
          <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
            <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-xl shadow-slate-200/50"
          >
            <span className="text-lg">✨</span>
          </motion.div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Ready for Analysis</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
            Upload a prescription to begin the extraction process. Our AI will handle the rest.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="h-20 px-8 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#FF4D00]/10 rounded-xl flex items-center justify-center border border-[#FF4D00]/20">
            <span className="text-xl">📋</span>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Extracted Results</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Analysis Complete</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('structured')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'structured' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            STRUCTURED
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'json' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {viewMode === 'structured' ? (
            <motion.div
              key="structured"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <StructuredView data={data} />
            </motion.div>
          ) : (
            <motion.div
              key="json"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative h-full"
            >
              <button
                onClick={handleCopyJson}
                className="absolute top-6 right-6 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center gap-2 z-20 active:scale-95 shadow-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-[#FF4D00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>COPY RAW JSON</span>
                  </>
                )}
              </button>
              <pre className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-slate-800 font-mono text-sm overflow-x-auto h-full leading-relaxed shadow-inner">
                {JSON.stringify(data, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OutputPanel;

