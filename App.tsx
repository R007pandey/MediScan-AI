
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import HistoryList from './components/HistoryList';
import Logo from './components/Logo';
import { analyzePrescription } from './services/geminiService';
import { PrescriptionData, HistoryItem } from './types';

const STORAGE_KEY = 'mediscan_rx_history';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<'landing' | 'results' | 'history'>('landing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState<PrescriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      } catch (err) {
        console.error("Failed to load history", err);
      }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const handleAnalyze = async (files: { base64: string; mimeType: string }[]) => {
    setIsAnalyzing(true);
    setError(null);
    setData(null);
    setViewState('results');

    try {
      const result = await analyzePrescription(files);
      setData(result);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: result
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // Limit to 50 items
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setData(item.data);
    setError(null);
    setViewState('results');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    setData(null);
    setError(null);
    setIsAnalyzing(false);
    setViewState('landing');
  };

  if (viewState === 'landing') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-slate-900">
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <h1 className="text-xl font-bold tracking-tight">
              MediScan <span className="text-[#FF4D00]">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {history.length > 0 && (
              <button 
                onClick={() => setViewState('history')}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm cursor-pointer hover:border-[#FF4D00]/50 transition-colors">
              RP
            </div>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 -mt-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-2xl flex flex-col items-center"
          >
            <Logo className="w-20 h-20 mb-6 shadow-2xl shadow-orange-500/20" />
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-4 text-slate-900">
              MediScan <span className="text-[#FF4D00]">AI</span>
            </h2>
            <p className="text-slate-500 text-center mb-12 max-w-lg mx-auto text-lg leading-relaxed">
              Upload up to 5 medical prescriptions to instantly extract structured clinical data using our AI engine.
            </p>
            
            <div className="w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <InputPanel 
                onAnalyze={handleAnalyze} 
                isLoading={isAnalyzing} 
                onReset={handleReset}
                isLanding={true}
              />
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAFAFA] text-slate-900 overflow-hidden font-sans">
      {/* Dashboard Header */}
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleReset} 
            disabled={isAnalyzing}
            className={`flex items-center gap-3 transition-opacity ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
          >
            <Logo className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">
              MediScan <span className="text-[#FF4D00]">AI</span>
            </h1>
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={handleReset}
            disabled={isAnalyzing}
            className={`text-xs font-bold transition-colors uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl ${
              isAnalyzing 
                ? 'text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                : 'text-[#FF4D00] hover:text-white hover:bg-[#FF4D00] border border-[#FF4D00]'
            }`}
          >
            + New Prescription
          </button>
          <button 
            onClick={() => setViewState(viewState === 'history' ? 'results' : 'history')}
            disabled={isAnalyzing}
            className={`text-sm font-bold transition-colors uppercase tracking-widest flex items-center gap-2 ${
              isAnalyzing ? 'opacity-50 cursor-not-allowed text-slate-400' :
              viewState === 'history' ? 'text-[#FF4D00]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 cursor-pointer hover:border-[#FF4D00]/50 transition-colors">
            RP
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {viewState === 'history' ? (
          <div className="flex-1 overflow-hidden bg-white">
            <HistoryList 
              items={history} 
              onSelectItem={handleSelectHistoryItem} 
              onDeleteItem={handleDeleteHistoryItem}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative bg-white flex justify-center">
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center space-y-8"
                >
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 rounded-full border-2 border-slate-100 border-t-[#FF4D00]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-12 h-12 bg-[#FF4D00]/10 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-[#FF4D00] text-3xl">💊</span>
                       </div>
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">Processing Prescriptions</h3>
                    <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Our AI models are extracting structured medical data from your documents.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="w-full max-w-5xl">
              <OutputPanel data={data} error={error} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

