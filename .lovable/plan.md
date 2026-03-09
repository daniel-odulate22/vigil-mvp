

# Vigil: Complete Build Specification

This is a full set of documents you can feed into any AI coding agent to rebuild Vigil from scratch, with lessons learned baked in.

---

## Document 1: Project Brief

```text
PROJECT: Vigil — Offline-First Medication Safety PWA

SUMMARY:
A Progressive Web App that lets patients scan medication barcodes, log doses,
track adherence, and receive reminders. Works fully offline. AI features
integrated for drug information and health insights.

CORE PRIORITIES (in order):
1. Barcode scanning & medication identification (MUST WORK RELIABLY)
2. Dose logging with offline-first persistence
3. Prescription management
4. Schedule & adherence tracking
5. AI-powered drug info, interaction checks, and health insights
6. Push notification reminders
7. User authentication & profiles

TECH STACK:
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Edge Functions, Storage)
- vite-plugin-pwa (Workbox service worker)
- IndexedDB for offline queue (idb or manual wrapper)

TARGET: Mobile-first, installable PWA. Must work on iOS Safari and Android Chrome.
```

---

## Document 2: Barcode Scanner Specification (PRIORITY)

```text
BARCODE SCANNER — CRITICAL PATH FEATURE

LESSONS LEARNED (avoid these mistakes):
1. Do NOT use html5-qrcode library — it has persistent issues with DOM
   container lifecycle, mobile camera initialization, and black screen bugs.
2. INSTEAD USE: ZXing (@aspect-software/barcode-reader or @AcrossTheCloud/ZXingBarcodeReader)
   OR build a thin wrapper around native MediaDevices API + a WASM barcode
   decoder like AiZXing/ZXing WASM.
3. The scanner DOM element MUST be mounted before camera init. Never
   conditionally render the video element.
4. On iOS Safari: video elements MUST have playsinline and muted attributes.
5. Use { facingMode: { ideal: 'environment' } } — never use exact constraint.
6. Keep FPS low (8-10) to avoid lag on low-end devices.

RECOMMENDED APPROACH — Native MediaDevices + ZXing WASM:

  Step 1: getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  Step 2: Attach stream to a <video playsinline muted autoplay> element
  Step 3: Use requestAnimationFrame loop to capture frames from canvas
  Step 4: Pass frame to ZXing WASM decoder
  Step 5: On detection, emit barcode string and stop stream

FEATURES:
- Camera preview with guided overlay (corner brackets, tips)
- Torch/flash toggle via videoTrack.applyConstraints({ advanced: [{ torch }] })
- Manual barcode entry fallback (UPC-A, UPC-E, EAN-8, EAN-13, NDC)
  - Validate: digits only, lengths 8/10/11/12/13/14
- Camera switch (front/back) when multiple cameras available
- Debug panel (togglable): device list, track settings, readyState, errors

SCAN RESULT FLOW:
  barcode → OpenFDA API lookup (GET https://api.fda.gov/drug/ndc.json?search=product_ndc:"CODE")
  → If found: show drug info modal (brand name, generic, manufacturer, dosage form)
  → User can: "Log Dose" or "Add to Prescriptions" or "Dismiss"
  → If not found: prompt manual medication entry form

OFFLINE BEHAVIOR:
  - OpenFDA responses cached via service worker (CacheFirst, 7-day expiry)
  - If offline and not cached: show "Drug info unavailable offline" and offer
    manual entry with medication name, dosage, frequency fields
```

---

## Document 3: Offline-First Architecture

```text
OFFLINE-FIRST ARCHITECTURE

PRINCIPLE: The app must be fully functional with zero connectivity.
Online sync is a bonus, not a requirement.

LAYER 1 — SERVICE WORKER (vite-plugin-pwa + Workbox):
  - Precache all app shell assets (JS, CSS, HTML, icons, fonts)
  - Runtime cache external API calls:
    - api.fda.gov/* → CacheFirst, 7 days, max 200 entries
    - rxnav.nlm.nih.gov/* → CacheFirst, 7 days, max 200 entries
  - registerType: 'autoUpdate'

LAYER 2 — IndexedDB OFFLINE QUEUE:
  Database: vigil-offline, version 1
  Object stores:
    - pending-doses (keyPath: id)
    - pending-prescriptions (keyPath: id)

  Schema for pending dose:
    { id: string (crypto.randomUUID()),
      user_id: string,
      medication_name: string,
      verified: boolean,
      taken_at: string (ISO),
      created_at: string (ISO),
      prescription_id?: string,
      notes?: string }

LAYER 3 — SYNC MANAGER:
  - On 'online' event: wait 2s for stable connection, then sync
  - Periodic sync every 5 minutes when online
  - Process queue sequentially, remove from IndexedDB on success
  - Show toast: "X doses synced" or "X failed, will retry"
  - Use a ref flag to prevent concurrent syncs

LAYER 4 — UI INDICATORS:
  - Offline banner at top of app when navigator.onLine === false
  - Pending sync badge showing count of queued items
  - "Saved offline" toast when logging dose while offline
```

---

## Document 4: Database Schema

```text
DATABASE SCHEMA (Supabase / Postgres)

-- Profiles (auto-created on signup via trigger)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  manufacturer text,
  ndc_code text,
  instructions text,
  refills_remaining integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Dose Logs
CREATE TABLE public.dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  medication_name text NOT NULL,
  prescription_id uuid,
  verified boolean DEFAULT false,
  taken_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Medication Reminders
CREATE TABLE public.medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prescription_id uuid,
  reminder_time time NOT NULL,
  days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}',
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drug Interactions Cache
CREATE TABLE public.drug_interactions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a text NOT NULL,
  drug_b text NOT NULL,
  severity text,
  description text,
  cached_at timestamptz DEFAULT now()
);

-- RLS: Enable on all tables. Every table uses policy:
--   USING (auth.uid() = user_id) / WITH CHECK (auth.uid() = user_id)
--   for SELECT, INSERT, UPDATE, DELETE
-- drug_interactions_cache: public read, authenticated insert

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-update updated_at columns
-- Apply to: profiles, prescriptions, medication_reminders
```

---

## Document 5: App Structure & Routes

```text
APP STRUCTURE

src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── scanner/
│   │   ├── BarcodeScanner.tsx    # Main scanner (MediaDevices + ZXing)
│   │   ├── ManualBarcodeEntry.tsx
│   │   ├── ScannerOverlay.tsx    # Guided UI + torch toggle
│   │   └── ScannerDebugPanel.tsx
│   ├── BottomNav.tsx     # 5 buttons: Home, Meds, [Scan], Schedule, Profile
│   ├── DoseTimeline.tsx  # Daily/weekly schedule with quick-log
│   ├── AdherenceCalendar.tsx
│   ├── VerifyModal.tsx   # Post-scan drug info + actions
│   ├── ProtectedRoute.tsx
│   ├── OfflineBanner.tsx
│   └── SplashScreen.tsx
├── hooks/
│   ├── useAuth.tsx
│   ├── useOnlineStatus.ts
│   ├── useOfflineSync.ts
│   ├── useDrugInteractions.ts
│   └── useNotifications.ts
├── lib/
│   ├── offlineStore.ts   # IndexedDB wrapper
│   └── utils.ts
├── pages/
│   ├── Index.tsx         # Home dashboard
│   ├── Auth.tsx          # Login/Signup
│   ├── PrescriptionsPage.tsx
│   ├── SchedulePage.tsx
│   └── ProfilePage.tsx
└── integrations/
    └── supabase/
        ├── client.ts     # Auto-generated, never edit
        └── types.ts      # Auto-generated, never edit

ROUTES:
  /          → Home (protected)
  /auth      → Login/Signup
  /prescriptions → Medication list (protected)
  /schedule  → Dose timeline (protected)
  /profile   → User settings (protected)

BOTTOM NAV (5 buttons, always visible on protected routes):
  [Home] [Meds] [SCAN] [Schedule] [Profile]
  Scan button is centered, larger, accent colored.
```

---

## Document 6: AI Features Specification

```text
AI FEATURES — EXTENSIBILITY PLAN

Use Supabase Edge Functions as the AI gateway. Keep the frontend AI-agnostic —
it calls edge functions, which call the AI provider.

PLANNED AI FEATURES:

1. DRUG INFORMATION ASSISTANT
   - User asks questions about their medications
   - Edge function calls LLM with drug context from prescriptions
   - Responses include side effects, food interactions, storage info

2. INTERACTION CHECKER (Enhanced)
   - Beyond RxNorm API: use AI to explain interactions in plain language
   - Severity classification and actionable advice

3. MEDICATION IDENTIFICATION FROM IMAGE
   - User photographs a pill
   - Edge function sends image to multimodal LLM (Gemini/GPT-5)
   - Returns probable identification with confidence score
   - Fallback: manual entry

4. ADHERENCE INSIGHTS
   - Weekly AI-generated summary of adherence patterns
   - Suggestions for improving timing consistency
   - Edge function analyzes dose_logs data

5. SMART REMINDERS
   - AI suggests optimal reminder times based on user behavior patterns

ARCHITECTURE:
  Frontend → supabase.functions.invoke('ai-drug-info', { body: {...} })
  Edge Function → validates auth → calls AI provider → returns response

  Store API keys as Supabase secrets.
  Support swapping providers without frontend changes.

EDGE FUNCTION TEMPLATE:
  supabase/functions/ai-drug-info/index.ts
  supabase/functions/ai-interaction-check/index.ts
  supabase/functions/ai-pill-identify/index.ts
```

---

## Document 7: Key Anti-Patterns to Avoid

```text
MISTAKES TO AVOID (learned from prior build):

1. SCANNER:
   - Do NOT use html5-qrcode. It has DOM lifecycle bugs on mobile.
   - Do NOT conditionally render the video/container element.
   - Do NOT use exact facingMode constraints.
   - DO test on actual mobile devices early — emulators hide real issues.

2. ARCHITECTURE:
   - Do NOT put scanner logic inside the Index page component.
     Keep it as a standalone component with clean open/close lifecycle.
   - Do NOT have multiple BottomNav instances scattered across routes.
     Use a single layout wrapper with one BottomNav.

3. AUTH:
   - Do NOT use anonymous signups.
   - Do NOT auto-confirm emails unless explicitly asked.
   - Do NOT store roles on the profiles table — use a separate user_roles table.

4. OFFLINE:
   - Do NOT assume online status. Always check before API calls.
   - Do NOT block UI on sync. Sync in background.
   - DO show clear offline indicators.

5. PWA:
   - Set manifest.json correctly with all icon sizes.
   - Test install flow on both iOS and Android.
   - Service worker must precache the app shell.

6. GENERAL:
   - Build and test one feature fully before moving to the next.
   - Start with: Auth → Scanner → Dose Logging → Prescriptions → Schedule
   - Do NOT add AI features until core medication logging works perfectly.
```

---

## Document 8: Build Order

```text
RECOMMENDED BUILD ORDER:

Phase 1 — Foundation
  1. Project setup (React + Vite + Tailwind + shadcn/ui + PWA plugin)
  2. Supabase setup (tables, RLS, triggers)
  3. Auth (signup, login, email verification, protected routes)
  4. App layout with single BottomNav wrapper

Phase 2 — Core Feature (SCANNER + DOSE LOGGING)
  5. Barcode scanner (MediaDevices API + ZXing WASM)
  6. Manual barcode entry fallback
  7. OpenFDA lookup integration
  8. Verify modal (show drug info, log dose, add to prescriptions)
  9. Offline dose queue (IndexedDB)
  10. Sync manager (online detection, background sync)

Phase 3 — Medication Management
  11. Prescriptions page (CRUD)
  12. Drug interaction checks (RxNorm API)
  13. Interaction warning modal

Phase 4 — Schedule & Adherence
  14. Medication reminders (CRUD)
  15. Dose timeline (daily/weekly view with quick-log)
  16. Adherence calendar heatmap

Phase 5 — AI Features
  17. Edge function: drug information assistant
  18. Edge function: AI interaction explainer
  19. Edge function: pill image identification
  20. Adherence insights dashboard

Phase 6 — Polish
  21. Push notifications
  22. Splash screen + onboarding
  23. Profile page
  24. PWA install prompt
  25. Performance optimization
```

You can copy each document section and feed them sequentially or all at once to your AI coding agent. The build order in Document 8 is the most important — it ensures the scanner and dose logging are rock-solid before anything else gets layered on.

