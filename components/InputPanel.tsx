
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InputMode } from '../types';

interface FileData {
  base64: string;
  mimeType: string;
  preview: string;
  name: string;
}

interface InputPanelProps {
  onAnalyze: (files: { base64: string; mimeType: string }[]) => void;
  isLoading: boolean;
  onReset: () => void;
  isLanding?: boolean;
  onError?: (message: string) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  onAnalyze,
  isLoading,
  onReset,
  isLanding = false,
  onError,
}) => {
  const reportError = (msg: string) => {
    if (onError) onError(msg);
    else console.warn(msg);
  };
  const [mode, setMode] = useState<InputMode>('upload');
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<FileData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    if (files.length + selected.length > 5) {
      reportError('Maximum 5 files allowed.');
      return;
    }

    const newFiles = await Promise.all(selected.map(async (file: File) => {
      return new Promise<FileData>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({
            base64,
            mimeType: file.type,
            preview: reader.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlBlur = async () => {
    if (!url) return;
    if (files.length >= 5) {
      reportError('Maximum 5 files allowed.');
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFiles(prev => [...prev, {
          base64,
          mimeType: blob.type,
          preview: reader.result as string,
          name: url.split('/').pop() || 'URL Image'
        }].slice(0, 5));
        setUrl('');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      reportError('Could not fetch image from URL. CORS or invalid link might be the cause.');
      console.error(err);
    }
  };

  const handleAnalyze = () => {
    if (files.length > 0) {
      onAnalyze(files.map(f => ({ base64: f.base64, mimeType: f.mimeType })));
    } else {
      reportError('Please provide at least one file or valid image URL.');
    }
  };

  const handleResetInternal = () => {
    setFiles([]);
    setUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onReset();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-col h-full ${isLanding ? 'p-8 space-y-8 bg-white' : 'p-8 space-y-8 bg-slate-50'}`}>
      {!isLanding && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[#FF4D00] uppercase tracking-widest">Input Source</h2>
          <p className="text-slate-500 text-xs">Upload up to 5 prescriptions for analysis.</p>
        </div>
      )}

      <div className="bg-slate-100 rounded-2xl p-1.5 flex relative border border-slate-200">
        <div className="absolute inset-y-1.5 transition-all duration-300 ease-out bg-white rounded-xl shadow-sm border border-slate-200/50"
             style={{ 
               width: 'calc(50% - 3px)', 
               left: mode === 'upload' ? '6px' : 'calc(50% + 3px)' 
             }} 
        />
        <button
          onClick={() => setMode('upload')}
          disabled={isLoading}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors ${
            mode === 'upload' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          UPLOAD
        </button>
        <button
          onClick={() => setMode('url')}
          disabled={isLoading}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors ${
            mode === 'url' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          URL
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {files.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selected Files ({files.length}/5)</label>
              <button 
                onClick={handleResetInternal} 
                disabled={isLoading}
                className="text-[10px] font-bold text-[#FF4D00] uppercase tracking-widest hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence>
                {files.map((f, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 group shadow-sm bg-white"
                  >
                    {f.mimeType === 'application/pdf' ? (
                      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold truncate w-full text-center text-slate-500">{f.name}</span>
                      </div>
                    ) : (
                      <img src={f.preview} alt="Preview" className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                    )}
                    {!isLoading && (
                      <button 
                        onClick={() => removeFile(i)} 
                        className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                ))}
                {files.length < 5 && !isLoading && (
                  <motion.button 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => fileInputRef.current?.click()} 
                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 hover:border-[#FF4D00]/50 flex flex-col items-center justify-center text-slate-500 hover:text-[#FF4D00] transition-colors bg-slate-50 hover:bg-orange-50/50"
                  >
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add More</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileChange}
            />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {mode === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center space-y-6 transition-all bg-white shadow-sm ${
                  isLoading 
                    ? 'border-slate-200 opacity-50 cursor-not-allowed' 
                    : 'border-slate-200 hover:border-[#FF4D00]/50 cursor-pointer hover:bg-slate-50'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors ${
                  isLoading ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200 group-hover:border-[#FF4D00]/30'
                }`}>
                  <svg className={`w-8 h-8 ${isLoading ? 'text-slate-400' : 'text-[#FF4D00]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-900 font-bold">Drop prescription here</p>
                  <p className="text-slate-500 text-xs">or click to browse files (Max 5)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </motion.div>
            )}

            {mode === 'url' && (
              <motion.div 
                key="url"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Direct Image Link</label>
                  <input
                    type="text"
                    placeholder="https://example.com/prescription.jpg"
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30 transition-all placeholder:text-slate-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-200">
        <button
          onClick={handleAnalyze}
          disabled={isLoading || files.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 transition-all ${
            isLoading || files.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-[#FF4D00] hover:bg-[#E60000] text-white shadow-xl shadow-orange-500/20 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Extract Data</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputPanel;

