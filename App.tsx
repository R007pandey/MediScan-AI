
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import HistoryList from './components/HistoryList';
import Logo from './components/Logo';
import { analyzePrescription } from './services/geminiService';
import { PrescriptionData, HistoryItem } from './types';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Dev mode — bypass auth + Firestore when VITE_DEV_MODE=true in .env.local
// ---------------------------------------------------------------------------
const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true';
const DEV_USER = {
  uid: 'dev-user',
  email: 'dev@localhost',
  displayName: 'Dev User',
  photoURL: null,
} as unknown as User;

// ---------------------------------------------------------------------------
// Toast — lightweight inline notification (replaces all alert() calls)
// ---------------------------------------------------------------------------
interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 max-w-sm"
  >
    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span className="flex-1">{message}</span>
    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-1">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </motion.div>
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const App: React.FC = () => {
  const [viewState, setViewState] = useState<'input' | 'results' | 'history'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState<PrescriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(IS_DEV ? DEV_USER : null);
  const [isAuthReady, setIsAuthReady] = useState(IS_DEV); // skip loading state in dev
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // Auth listener — skipped in dev mode
  useEffect(() => {
    if (IS_DEV) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore History listener — in-memory history in dev mode
  useEffect(() => {
    if (IS_DEV || !isAuthReady || !user) return;

    const q = query(
      collection(db, `users/${user.uid}/history`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyItems: HistoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        try {
          historyItems.push({
            id: docData.id,
            timestamp: docData.timestamp,
            data: JSON.parse(docData.data),
          });
        } catch (e) {
          console.error('Failed to parse history item', e);
        }
      });
      setHistory(historyItems);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/history`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleAnalyze = async (files: { base64: string; mimeType: string }[]) => {
    if (!user) {
      showToast('Please sign in to analyze prescriptions.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setData(null);
    setViewState('results');

    try {
      const result = await analyzePrescription(files);
      setData(result);

      // In dev mode: save to in-memory history only
      if (IS_DEV) {
        const id = crypto.randomUUID();
        setHistory(prev => [{ id, timestamp: Date.now(), data: result }, ...prev]);
      } else {
        // Save to Firestore
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        const path = `users/${user.uid}/history/${id}`;
        try {
          await setDoc(doc(db, path), {
            id,
            userId: user.uid,
            timestamp,
            data: JSON.stringify(result),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setData(item.data);
    setError(null);
    setViewState('results');
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!user) return;
    if (IS_DEV) {
      setHistory(prev => prev.filter(item => item.id !== id));
      return;
    }
    const path = `users/${user.uid}/history/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
    setIsAnalyzing(false);
    setViewState('input');
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      showToast(`Sign in failed: ${msg}. If you use a popup blocker, allow popups for this site.`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF4D00] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-slate-900 items-center justify-center p-6">
        <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md flex flex-col items-center bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100"
        >
          <Logo className="w-20 h-20 mb-6 shadow-xl shadow-orange-500/20" />
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-3 text-slate-900">
            MediScan <span className="text-[#FF4D00]">AI</span>
          </h2>
          <p className="text-slate-500 text-center mb-10 text-sm leading-relaxed">
            Sign in to upload medical prescriptions and instantly extract structured clinical data using our AI engine.
          </p>

          <button
            onClick={handleSignIn}
            className="flex items-center justify-center gap-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-6 py-4 rounded-xl transition-all shadow-sm hover:shadow-md w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAFAFA] text-slate-900 overflow-hidden font-sans">
      <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast(null)} />}</AnimatePresence>

      {/* Dev mode banner */}
      {IS_DEV && (
        <div className="bg-amber-400 text-amber-900 text-xs font-bold text-center py-1.5 uppercase tracking-widest">
          ⚠ Dev Mode — Auth + Firestore bypassed · Gemini called directly from client
        </div>
      )}

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
            onClick={() => setViewState(viewState === 'history' ? 'input' : 'history')}
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
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                {user.email?.[0].toUpperCase() ?? 'U'}
              </div>
            )}
            <button onClick={logOut} className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest">
              Log Out
            </button>
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
        ) : viewState === 'input' ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#FAFAFA]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-2xl flex flex-col items-center"
            >
              <Logo className="w-16 h-16 mb-6 shadow-xl shadow-orange-500/20" />
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-3 text-slate-900">
                New Prescription
              </h2>
              <p className="text-slate-500 text-center mb-8 max-w-lg mx-auto text-sm leading-relaxed">
                Upload up to 5 medical prescriptions to instantly extract structured clinical data.
              </p>
              <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <InputPanel
                  onAnalyze={handleAnalyze}
                  isLoading={isAnalyzing}
                  onReset={handleReset}
                  isLanding={true}
                  onError={showToast}
                />
              </div>
            </motion.div>
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
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
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
              <OutputPanel data={data} error={error} onReset={handleReset} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
