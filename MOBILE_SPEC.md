# MediScan AI — Android MVP Spec

> **Scope:** Stabilization (Epic 0) + Phase 1 (parity with web) + selected Phase 2 wins.
> **Platform:** Android first, built on Expo / React Native (cross-platform-ready).
> **Backend:** Reuse existing Firebase Auth + Firestore + `analyzePrescription` Cloud Function.
>
> This is a TODO board. Pick tickets, don't build yet.

---

## Goals
1. Stabilize the backend contract so partial model responses never crash the UI.
2. Ship an Android APK that replicates the full web flow on a phone.
3. Single codebase that can target iOS later with minimal rework.

## Non-goals (MVP)
- Medicine reminders, refill alerts, drug interactions
- Doctor share links, pharmacy/telemedicine integrations
- Multilingual OCR, voice input
- PDF export, biometric lock, push notifications (deferred — see below)
- pnpm workspaces / shared package extraction (duplicate `types.ts` is acceptable for MVP)
- Firebase Storage for original images
- App Store / iOS submission

---

## Combined feature list (MVP)

**Stabilization (Epic 0 — do first, release blocker):**
- Normalize backend response shape
- 30s timeout with recoverable error
- Firebase emulator wiring for local dev
- Remove direct Gemini key from mobile client

**Core flow (Phase 1 parity):**
- Google sign-in (+ DEV_MODE auth bypass for local dev)
- Camera capture + gallery picker (max 5 images, backend limit)
- Multi-page capture
- Image compression before upload
- Call `analyzePrescription` Cloud Function only — no client-side key
- Result screen with safe null handling
- Save to Firestore
- History list + detail view

**Selected Phase 2 native wins (in MVP):**
- Native share (text summary)

**Deferred to post-MVP** (see Deferred section):
- Edge detection + auto-crop (C4)
- PDF export (E5)
- Push notifications (G1–G3)
- Biometric lock (H1)
- Edit extracted fields (E4)

---

## Tickets

Format: `[ID] Title — estimate — depends on`
Sized in T-shirts (S = <1d, M = 1–3d, L = 3–5d).
✅ = done, 🔲 = todo

### EPIC 0 — Stabilization ⚠️ Release blocker — do before Epic E / F

- 🔲 **0.1** — Normalize Cloud Function response — **S** — _none_
  - Add `normalizeResponse()` in `functions/src/index.ts`
  - `patient_info`, `doctor_info`, `medical_info` always objects, never null
  - `medicines`, `symptoms`, `diagnostics_tests`, `warnings` default to `[]`
  - Return normalized shape; do not ship raw model output
- 🔲 **0.2** — Add 30s client-side timeout on the callable — **S** — A5
  - Wrap `callAnalyze()` in a `Promise.race` with a 30s timeout
  - Timeout resolves to a typed error the UI can display
  - No infinite spinner under any condition
- 🔲 **0.3** — Enforce max 5 files on client (mirrors backend cap) — **S** — C1, C2
  - Camera: `MAX_PAGES = 5`
  - Gallery picker: `selectionLimit = 5`
  - Already enforced server-side; client enforces for UX clarity
- 🔲 **0.4** — Remove direct Gemini client path from mobile — **S** — _none_
  - Delete `analyzeViaDirect()` and `EXPO_PUBLIC_GEMINI_API_KEY` from `geminiService.ts`
  - `DEV_MODE` now only bypasses auth; the Cloud Function is always the AI backend
  - Remove `EXPO_PUBLIC_GEMINI_API_KEY` from `.env.local` and `.env.example`
- 🔲 **0.5** — Wire Firebase emulators behind `EXPO_PUBLIC_USE_EMULATOR` — **M** — A5
  - `connectAuthEmulator`, `connectFirestoreEmulator`, `connectFunctionsEmulator`
  - Only active when `EXPO_PUBLIC_USE_EMULATOR=true`
  - Document `functions/.secret.local` for emulator secret handling
- 🔲 **0.6** — Backend contract tests — **M** — 0.1
  - Model response missing `patient_info` / `doctor_info` / `medical_info` does not crash
  - Invalid non-prescription returns clean rejection reason, not infinite loading
  - Oversized payload (> 5 files or > 10MB) returns a clear error string

### EPIC A — Project foundation

- ✅ **A1** — Expo + TypeScript app in `mobile/` with expo-router
- ~~**A2**~~ — ~~Convert repo to pnpm workspaces~~ → **Deferred post-MVP**
- ~~**A3**~~ — ~~Extract shared package `packages/shared`~~ → **Deferred post-MVP**
  - `types.ts` is intentionally duplicated in `mobile/` until workspaces are set up
- ✅ **A4** — NativeWind wired, color tokens match web
- ✅ **A5** — Firebase config in `mobile/firebase.ts` (auth, db, functions)
- 🔲 **A6** — EAS Build for Android APK + AAB — **M** — A1
  - `eas.json` with `preview` (APK, direct install) and `production` (AAB) profiles
  - Document `eas build --platform android --profile preview` in `mobile/README.md`
- ✅ **A7** — `.env` handling via `EXPO_PUBLIC_*` vars

### EPIC B — Auth

- ✅ **B1** — Google sign-in via `expo-auth-session` → `signInWithCredential`
- ✅ **B2** — Sign-out + `inMemoryPersistence` (re-login on cold restart; acceptable for MVP)
- ✅ **B3** — `EXPO_PUBLIC_DEV_MODE=true` bypasses auth only; uses DEV_USER mock
- ✅ **B4** — Route guard: unauthenticated → `/sign-in`, authenticated → `/(tabs)`

### EPIC C — Capture

- ✅ **C1** — Camera screen: tap-autofocus, flash, capture
- ✅ **C2** — Gallery picker (multi-select, up to 5 images — backend limit)
- ✅ **C3** — Multi-page capture: thumbnail strip, remove pages, "Analyze Np" CTA
- 🔲 **C4** — Document edge detection + auto-crop → **Deferred post-MVP**
- ✅ **C5** — Image compression: 2048px max, JPEG 0.85, base64 encode

### EPIC D — Analysis

- ✅ **D1** — `services/geminiService.ts`: always calls Cloud Function only
  - No direct `@google/genai` path; no `EXPO_PUBLIC_GEMINI_API_KEY`
  - `EXPO_PUBLIC_DEV_MODE` controls auth bypass only, not which backend is called
- ✅ **D2** — Full-screen analyzing overlay with page count
- ✅ **D3** — Error handling: rejection reason shown as Alert; "Scan again" retry
  - 🔲 Add hard 30s timeout (tracked as **0.2**)

### EPIC E — Results

- ✅ **E1** — Result screen: Patient / Doctor / Diagnosis / Medicines / Tests / Notes
- ✅ **E2** — Medicine card: name, dosage, frequency, duration, instructions
- 🔲 **E3** — Save to Firestore — **S** — E1, A5
  - `users/{uid}/prescriptions/{id}`: normalized result, timestamp, file count, confidence
  - No original images (Firebase Storage deferred)
- 🔲 **E4** — Edit extracted fields → **Deferred post-MVP**
- 🔲 **E5** — PDF export → **Deferred post-MVP**
- ✅ **E6** — Native share (text summary via system share sheet)
- 🔲 **E7** — Firebase Storage for images → **Deferred post-MVP**

### EPIC F — History

- 🔲 **F1** — History list: Firestore listener on `users/{uid}/prescriptions` — **M** — E3
  - Card: date, doctor name, top medicine name, confidence dot
- 🔲 **F2** — Pull-to-refresh + empty state — **S** — F1
- 🔲 **F3** — Tap → detail view (reuses E1 layout, read-only) — **S** — F1, E1
- 🔲 **F4** — Delete prescription with confirm modal — **S** — F1
- 🔲 **F5** — Skeleton loaders — **S** — F1

### EPIC G — Notifications → Deferred post-MVP

- 🔲 **G1–G3** — Push notifications (FCM, local, deep-link) → **Deferred**

### EPIC H — Security & polish

- 🔲 **H1** — Biometric app lock → **Deferred post-MVP**
- ✅ **H2** — Dark mode (follows system)
- ✅ **H3** — Settings screen: account info, sign out, version
- 🔲 **H4** — DPDP consent screen on first launch — **M** — A1
  - Consent stored locally + in Firestore; link to privacy policy
- 🔲 **H5** — Crash reporting (Sentry or Firebase Crashlytics) — **S** — A1
- 🔲 **H6** — App-event analytics only (no PHI) — **S** — A1

### EPIC I — Release

- 🔲 **I1** — App icon + splash screen — **S** — A1
- 🔲 **I2** — Privacy policy + Play Store data safety form — **M** — H4
- 🔲 **I3** — Play Internal Testing track — **M** — A6, I1
- 🔲 **I4** — Closed beta (up to 100 testers) — **S** — I3
- 🔲 **I5** — Smoke test checklist — **S** — all functional epics
  - Fresh install → sign-in → camera scan → result → history → sign-out
  - Gallery 1 image → result → save
  - 5-image limit enforced client-side
  - Invalid image → rejection alert (no infinite spinner)
  - History item opens detail view

---

## Build order (revised)

1. **Stabilization first:** 0.4 → 0.3 → 0.1 → 0.2 → 0.5 → 0.6
2. **Foundation:** A6 (EAS)
3. **History + save:** E3 → F1 → F2 → F3 → F4 → F5
4. **Polish:** H4 → H5 → H6
5. **Release:** I1 → I2 → I3

---

## Release checks (all must pass before beta)

- [ ] `npm run lint` in repo root passes
- [ ] `npm run build` in repo root passes
- [ ] `cd functions && npm run lint` passes
- [ ] `cd mobile && npx tsc --noEmit` passes
- [ ] Android Expo build profile produces an installable APK
- [ ] Manual smoke test I5 completed

---

## Open decisions (closed for MVP)

- ✅ Repo layout: web at root, `mobile/` sibling — no migration
- ✅ Firebase Storage: deferred
- ✅ Edit fields (E4): deferred
- ✅ App name: MediScan AI, package: `com.mediscan.app`
- 🔲 Privacy policy URL — reuse web app domain?
