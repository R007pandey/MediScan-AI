/**
 * analysisStore.ts
 *
 * Module-level singleton to pass analysis results between screens without
 * serialising large JSON into route params.
 *
 * viewMode:
 *   'fresh'   — came from camera, show "Scan another" CTA
 *   'history' — came from history list, show "Back to History" CTA
 */

import type { PrescriptionData } from '../types';

type ViewMode = 'fresh' | 'history';

let _result: PrescriptionData | null = null;
let _capturedUris: string[] = [];
let _fileCount: number = 0;
let _viewMode: ViewMode = 'fresh';

export const analysisStore = {
  setResult: (data: PrescriptionData) => { _result = data; },
  getResult: (): PrescriptionData | null => _result,

  setUris: (uris: string[]) => { _capturedUris = [...uris]; },
  getUris: (): string[] => _capturedUris,

  setFileCount: (n: number) => { _fileCount = n; },
  getFileCount: (): number => _fileCount,

  setViewMode: (mode: ViewMode) => { _viewMode = mode; },
  getViewMode: (): ViewMode => _viewMode,

  clear: () => {
    _result = null;
    _capturedUris = [];
    _fileCount = 0;
    _viewMode = 'fresh';
  },
};
