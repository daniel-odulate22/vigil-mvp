

# Vigil Visual Redesign + Google Auth Fix + Bug Sweep

## Overview
Three workstreams: (1) redesign the UI to match the dark navy/teal design reference, (2) fix Google sign-in by switching to Lovable Cloud managed OAuth, and (3) audit the app flow for errors.

---

## 1. Visual Redesign

The reference images show a **dark navy** (`#1a2332` / `#243447`) theme with **teal accents** (`#2dd4bf` / `#14b8a6`), white text, and clean card layouts. This is a significant departure from the current "bone/royal-blue dark academia" palette.

### Color System Overhaul (`src/index.css`)
- **Background**: Dark navy (`~220 30% 14%`)
- **Cards**: Slightly lighter navy (`~220 25% 18%`)
- **Primary**: Teal/cyan (`~168 76% 50%`)
- **Foreground**: White/near-white
- **Muted**: Slate gray tones
- Remove the current light mode (bone/powder-blue) and make the dark navy the default
- Keep `.dark` class for potential future use but main theme is the dark navy

### Font Update
- Switch from serif (Crimson Text / Playfair Display) to a clean sans-serif (Inter or the system font stack) to match the modern clinical look in the reference

### Component-by-Component Redesign

**Splash Screen** (`SplashScreen.tsx`):
- Dark navy full-screen background
- "VIGIL" in large white serif text (keep Playfair for logo only)
- Subtitle: "Your Medication. Protected." in lighter gray
- Simple loading dots at bottom

**Auth Page** (`Auth.tsx`):
- Dark navy background, teal accent buttons
- Clean card with rounded corners
- Google sign-in button with proper styling

**Home Dashboard** (`HomePage.tsx`):
- Match "VIGIL Home Dashboard" reference: greeting with user name, notification bell icon top-right
- "Next Medicine" card showing medication name, dosage, time with a teal "I have taken this" button
- "Later Today" section listing upcoming medications with colored dots
- Bottom nav with teal scan button

**Prescriptions/My Medicines** (`PrescriptionsPage.tsx`):
- Match "My Medicines List" reference: each med card shows name, time, NAFDAC number, edit icon
- Teal "Add New Medicine" button at bottom

**Schedule Page** (`SchedulePage.tsx`):
- Match "Weekly Schedule" reference: calendar strip at top showing week days
- Time-grouped medication cards with status badges (COMPLETED, UPCOMING)

**Bottom Nav** (`BottomNav.tsx`):
- Dark background nav bar
- 5 icons: Home, Schedule, Scan (center, prominent teal circle), Patients/Meds, Settings
- Active state in teal

**Scanner** (`BarcodeScanner.tsx`):
- Match "Barcode Scanner" reference: dark background, white scan frame with corner brackets
- "Place the barcode inside the box" instruction text
- Flashlight toggle button
- "Type name instead" link at bottom
- "Hold the phone steady" tip

**Verify Modal / Dose Confirmation** (`VerifyModal.tsx`):
- Match "Dose Confirmation" reference: green checkmark circle at top
- "Medication Identified" header with green "Match found" badge
- Drug details (name, manufacturer, dosage, NAFDAC Reg No)
- Teal "Confirm Match" button
- Red "This doesn't look right. Scan again." link
- Dot pagination indicators

### Tailwind Config (`tailwind.config.ts`)
- Update color tokens to match new palette
- Replace serif font families with sans-serif (keep display font for logo/brand only)

---

## 2. Fix Google Sign-In

**Root cause**: The app uses `supabase.auth.signInWithOAuth()` directly. Lovable Cloud requires using the managed `lovable.auth.signInWithOAuth()` method.

**Steps**:
1. Use the Configure Social Login tool to generate the `src/integrations/lovable/` module
2. Update `src/hooks/useAuth.tsx`: replace `supabase.auth.signInWithOAuth` with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
3. Import from `@/integrations/lovable/index`

---

## 3. App Flow Audit & Fixes

**Issues identified**:

1. **Auth race condition**: The `onAuthStateChange` listener and `getSession` can race. Fix by making `getSession` the primary source and only using `onAuthStateChange` for subsequent changes (per the stack overflow pattern).

2. **Sign-up redirect**: After sign-up, the code immediately navigates to `/` even though email isn't confirmed yet. Should show a "check your email" message instead.

3. **Index.tsx `/welcome` → `/` loop**: When a logged-in user visits `/welcome`, splash completes → sets state to `done` → navigates to `/` (which is HomePage, not Index). This is fine, but if they're already on `/`, the navigation is redundant. Minor issue.

4. **Missing `ndc_code` column in types**: The prescriptions table has `ndc_code` but need to verify the Supabase types include it (the code references it in inserts).

5. **ProtectedRoute flicker**: Uses `useEffect` + `navigate` which can cause a flash. Should return `<Navigate>` directly for cleaner redirect.

---

## Technical Details

### Files to modify:
| File | Change |
|------|--------|
| `src/index.css` | Complete color palette overhaul to dark navy/teal |
| `tailwind.config.ts` | Update brand colors, font families |
| `index.html` | Update font imports (add Inter, keep Playfair for logo) |
| `src/hooks/useAuth.tsx` | Fix Google OAuth to use Lovable Cloud, fix auth race condition |
| `src/pages/Auth.tsx` | Redesign UI, add "check email" state after signup |
| `src/components/SplashScreen.tsx` | Redesign to dark navy theme |
| `src/components/OnboardingFlow.tsx` | Redesign slides to match dark theme |
| `src/pages/HomePage.tsx` | Full redesign matching reference dashboard |
| `src/pages/PrescriptionsPage.tsx` | Redesign to match "My Medicines" reference |
| `src/pages/SchedulePage.tsx` | Redesign with calendar strip and status badges |
| `src/pages/ProfilePage.tsx` | Redesign to match dark theme |
| `src/components/BottomNav.tsx` | Dark nav with teal accent scan button |
| `src/components/BarcodeScanner.tsx` | Redesign overlay to match reference |
| `src/components/VerifyModal.tsx` | Redesign to match dose confirmation reference |
| `src/components/AppLayout.tsx` | Update AI button styling |
| `src/components/ProtectedRoute.tsx` | Fix redirect pattern |
| `src/components/OfflineBanner.tsx` | Restyle for dark theme |

### Build order:
1. Fix Google OAuth (Configure Social Login tool + code update)
2. Update color system and fonts (index.css, tailwind.config, index.html)
3. Redesign each page/component to match references
4. Fix auth flow bugs (race condition, signup confirmation)
5. Test end-to-end

