# MediScan AI — Mobile App Plan

> Planning doc only. Nothing here is committed work — pick what's useful, drop the rest.

---

## 1. Platform decision: **Android first, iOS second** (cross-platform from day 1)

**Why Android first**
- ~95% of the Indian smartphone market is Android. The handwritten-prescription problem is a near-uniquely Indian use case, so that's where the users are.
- No $99/yr Apple developer fee, no App Store review delays, faster iteration.
- Side-loading APKs for beta testers is trivial (Play Internal Testing or direct APK).
- Cheaper test devices for the long tail of low-end hardware where OCR pain is worst.

**Why still build cross-platform**
- iOS users skew higher on willingness-to-pay; you'll want them once monetization shows up.
- Doctors and clinics in tier-1 cities are disproportionately on iOS.
- One codebase = one bug surface.

## 2. Framework: **Expo (React Native)**

| Option | Verdict |
|---|---|
| **Expo / React Native** | ✅ Recommended. Reuses your existing React 19 + TS knowledge, Firebase JS SDK works as-is, EAS Build handles signing/store submission, OTA updates via `expo-updates`. |
| Flutter | Strong camera/perf story but throws away your React/TS investment and the Firebase wiring you already have. |
| Native (Kotlin + Swift) | Best perf, 2× the work. Only worth it if you hit a perf wall — you won't, this app is I/O bound on the Gemini call. |
| PWA / TWA wrapper | Cheapest path but no real camera control, no push, no background tasks. Dead end for a medical app. |

**Stack**
- Expo SDK (latest), TypeScript, expo-router (file-based nav, mirrors Next/Vite mental model)
- Firebase JS SDK (same `auth` / `firestore` / `functions` instances you already have)
- `expo-camera` + `expo-image-picker` for capture
- `react-native-vision-camera` if/when you need frame processors (edge detection)
- NativeWind for Tailwind classes → keeps styling consistent with the web app
- Zustand or Jotai for state (Redux is overkill here)

**Repo layout**
- Keep web in repo root, add `mobile/` as an Expo app
- Extract shared code into `packages/shared/` (types, `geminiService`, prompt, schema)
- pnpm workspaces to wire it together

---

## 3. Feature roadmap (phased)

### Phase 1 — MVP (parity with web, ~2–3 weeks)
- Google sign-in (Firebase Auth, native flow via `expo-auth-session`)
- Camera capture with auto-focus + tap-to-focus
- Gallery picker (multi-select for multi-page prescriptions)
- Send to existing `analyzePrescription` Cloud Function — **zero backend changes**
- Result screen: patient / doctor / medicines / diagnostics, same shape as web
- History list backed by the same Firestore collection
- Pull-to-refresh, empty states, error toasts
- Dark mode

### Phase 2 — Mobile-native wins (~3–4 weeks)
> **MVP slice = stabilization + Phase 1 only.** The items below are Phase 2 full — none are in the Android MVP build.

- **Document edge detection + auto-crop** (Vision Camera frame processor or `react-native-document-scanner-plugin`) — this alone makes OCR dramatically better
- **Multi-page stitching** — capture page 1, 2, 3… submit as one analysis (max 5, backend limit)
- **Offline queue** — capture without internet, auto-upload when back online
- **Family profiles** — switch between "Self / Mom / Dad / Kid" before scanning, results filed per profile
- **Push notifications** (FCM via `expo-notifications`) — deferred; not in MVP
- **Share / export as PDF** — `expo-print` to a polished one-pager — deferred; not in MVP
- **Biometric app lock** (Face ID / fingerprint via `expo-local-authentication`) — deferred; not in MVP

### Phase 3 — Smart health layer (~4–6 weeks)
- **Medicine reminders** — parse `frequency` + `duration` from extraction, schedule local notifications (`expo-notifications` triggers, no server needed)
- **Refill alerts** — "Metformin runs out in 3 days"
- **Drug interaction warnings** — call out clashes between current medicines (Gemini second pass, or open RxNorm/openFDA dataset)
- **Search history** — full-text over past prescriptions ("when did I last take amoxicillin?")
- **Home-screen widget** — "Next dose: Metformin 500mg at 9pm"
- **Quick-glance lock-screen card** for the next dose

### Phase 4 — Connected care (~6–8 weeks)
- **Share with doctor** — generate a signed shareable link (Cloud Function + Firestore TTL doc) instead of plaintext WhatsApp forwards
- **Pharmacy integration** — deep-link to 1mg / Tata 1mg / PharmEasy with prefilled cart
- **Telemedicine handoff** — book follow-up via Practo/MFine partner APIs
- **Multilingual OCR** — Hindi / Tamil / Bengali / Marathi prescriptions (prompt the model in target language; Gemma handles it)
- **Voice input** — "I took my evening dose" via `expo-speech-recognition`
- **Caregiver mode** — shared family vault with read-only access for an elderly parent's child

### Phase 5 — AI wellness (long tail, optional)
- Symptom checker (Gemini chat with disclaimer rails)
- Chronic condition tracking (BP, sugar log alongside prescription history)
- Adherence scoring — "You took 87% of doses this month"
- Side-effect journaling, fed back into next-prescription summary
- Lab report scanner (extends the same OCR pipeline to blood reports)

---

## 4. Cross-cutting concerns (apply to every phase)

### Privacy & compliance
- **DPDP Act 2023** (India): explicit consent screen on first launch, data deletion flow, data export
- All medical data stays in user's Firestore namespace (already the case)
- No analytics on prescription content — only on app events (screens, button taps)
- Encrypted local cache (`expo-secure-store` for tokens, `MMKV` with encryption for cached results)

### Trust & safety
- Prominent disclaimer on every result: "AI-generated. Verify with your doctor."
- Confidence badge ported from web (`high` / `medium` / `low`)
- One-tap "Report wrong extraction" → feedback Firestore collection → fine-tune signal

### Distribution
- Phase 1: Play Internal Testing (10 testers, instant) → Closed Beta (up to 100, no review)
- Phase 2: Open Beta on Play
- Phase 3+: Production on Play, then App Store
- EAS Update for OTA JS-only fixes (no store re-submission for bug fixes)

### Monetization (whenever you're ready)
- Free tier: N scans/month
- Pro (~₹99/mo): unlimited scans, family profiles, reminders, PDF export
- Clinic tier: bulk scans + branded PDFs

---

## 5. Suggested first slice to actually build

**Stabilization + Phase 1 only.** Prove the backend contract is solid, then ship a clean camera → analyze → result → history flow. That's the demo that makes someone say "I need this on my phone."

Edge detection, reminders, push notifications, and PDF export come after the first APK is in testers' hands.

---

## 6. Risks / open questions

- **Gemma 4 26B latency on mobile networks** — measure on 4G, may need a smaller model or streaming UI
- **Firebase JS SDK bundle size on RN** — consider `@react-native-firebase/*` if startup time gets ugly
- **Play Store medical app review** — health-claim language needs a once-over by someone who's shipped a medical app
- **HIPAA** — only relevant if you target the US; DPDP is the Indian analog and is lighter
