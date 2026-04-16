<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MediScan AI — Prescription Reader

Upload medical prescriptions (images or PDFs) and instantly extract structured clinical data: patient info, doctor info, medicines with dosage/frequency/duration, diagnosis, and more.

**Stack:** React 19 + TypeScript + Vite 6 + Tailwind 4 + Firebase (Auth + Firestore + Functions) + Gemini AI

---

## Architecture

```
Browser (React SPA)
  └── Firebase Auth (Google sign-in)
  └── Firestore (per-user history, real-time sync)
  └── httpsCallable("analyzePrescription")
          └── Cloud Function (Node 20)
                  └── Gemini API  ← key lives here, never in client
```

The Gemini API key lives exclusively in the Cloud Function environment. It is never bundled into the client.

---

## Local Development

**Prerequisites:** Node.js 20+, Firebase CLI (`npm install -g firebase-tools`)

### 1. Clone and install client dependencies

```bash
git clone https://github.com/R007pandey/MediScan-AI.git
cd MediScan-AI
npm install
```

### 2. Install Cloud Function dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Set up environment

```bash
cp .env.example .env.local
```

No client-side env vars are required. The `.env.local` file is kept for documentation.

### 4. Configure Firebase emulators (for local Function testing)

```bash
# Log in to Firebase
firebase login

# Create functions/.env with your Gemini key
echo "GEMINI_API_KEY=your-key-here" > functions/.env

# Start emulators (Auth + Firestore + Functions)
firebase emulators:start
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deploy

### Deploy Cloud Function + Firestore rules

```bash
# Set the Gemini key as a Firebase secret (stored server-side, never in code)
firebase functions:secrets:set GEMINI_API_KEY

# Deploy everything
firebase deploy
```

### Deploy frontend

The frontend is a standard Vite SPA — deploy the `dist/` folder to Firebase Hosting, Vercel, or any static host.

```bash
npm run build
# dist/ is ready to serve
```

Add your deployment domain to **Firebase Console → Authentication → Authorized Domains** so Google sign-in works in production.

---

## Firestore Security Rules

Rules are in `firestore.rules`. Key points:
- Per-user isolation — users can only read/write their own history
- All fields validated on write (id, userId, timestamp, data)
- 1MB document size cap
- Default deny on all other paths

Deploy rules with: `firebase deploy --only firestore:rules`

---

## Project Structure

```
├── App.tsx                  # Root component, auth + Firestore listeners
├── components/
│   ├── InputPanel.tsx       # File upload / URL input
│   ├── OutputPanel.tsx      # Results display with structured + JSON views
│   ├── StructuredView.tsx   # Rendered prescription cards
│   ├── HistoryList.tsx      # Past analyses with search + sort
│   └── Logo.tsx
├── services/
│   └── geminiService.ts     # Client wrapper for analyzePrescription callable
├── functions/
│   └── src/index.ts         # Cloud Function — Gemini call lives here
├── firebase.ts              # Firebase app init + auth helpers
├── firestore.rules          # Firestore security rules
├── types.ts                 # Shared TypeScript interfaces
└── vite.config.ts           # Build config (no secrets)
```
