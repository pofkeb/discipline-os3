# Discipline OS — Production Setup Guide

This is the complete step-by-step guide to go from the current codebase state to a live app in both stores.

---

## Part 0 — Prerequisites

```bash
# Install EAS CLI globally (already on this machine)
npm install -g eas-cli

# Log in to your Expo account
eas login

# Verify
eas whoami
```

---

## Part 1 — One-Time Project Configuration

### 1.1 Set your bundle identifier and package name

Open `frontend/app.json` and replace the two placeholders:

```json
"ios": {
  "bundleIdentifier": "com.yourcompany.disciplineos"  ← replace yourcompany
},
"android": {
  "package": "com.yourcompany.disciplineos"  ← replace yourcompany
}
```

**Rules:**
- Must be globally unique (App Store / Play Store enforce this)
- Lowercase only, dots as separators
- Example: `com.jsmith.disciplineos` or `com.disciplineapp.ios`
- iOS and Android can share the same identifier

### 1.2 Initialize EAS project

Run this once from the `frontend/` directory:

```bash
cd frontend
eas init
```

This will:
- Associate the project with your Expo account
- Add `extra.eas.projectId` to `app.json` automatically
- Set the `owner` field in `app.json` automatically

### 1.3 Replace app icons and splash screen

**Current state:** All images are default Expo template placeholders.

| File | Current | Required |
|---|---|---|
| `assets/images/icon.png` | 512×513 RGBA (non-square, wrong size) | 1024×1024 PNG, **no alpha channel** (iOS) |
| `assets/images/adaptive-icon.png` | 512×513 RGBA | 1024×1024 PNG with transparent background |
| `assets/images/splash-image.png` | 336×729 | Replace with your actual splash content |

**iOS App Store requirement:** `icon.png` must be 1024×1024 with no alpha. Export from your design tool as RGB PNG (not RGBA).

```bash
# Verify no alpha channel after replacing:
python3 -c "from PIL import Image; img = Image.open('assets/images/icon.png'); print(img.mode)"
# Must print 'RGB', not 'RGBA'
```

---

## Part 2 — RevenueCat Setup

### 2.1 Create RevenueCat account

1. Go to https://app.revenuecat.com and create an account
2. Create a **New Project** named "Discipline OS"

### 2.2 Add apps to RevenueCat

In your project dashboard:
- Click **Add App** → **App Store** → enter your iOS bundle identifier
- Click **Add App** → **Google Play** → enter your Android package name

### 2.3 Get your SDK keys

Go to **Project Settings → API Keys → Public App Specific Keys**:
- Copy the **iOS** key (starts with `appl_`)
- Copy the **Android** key (starts with `goog_`)

### 2.4 Configure entitlement

In RevenueCat dashboard:
1. Go to **Entitlements** → **+ New**
2. Name it exactly: `pro`
3. Save

### 2.5 Create products in stores (see Part 3 and Part 4 first)

After creating products in App Store Connect and Google Play:
1. In RevenueCat → **Products** → **+ New**
2. Add your monthly and annual product IDs for each store

### 2.6 Create offering

1. Go to **Offerings** → **+ New Offering**
2. Add two **Packages**:
   - Package type: **Monthly** — attach the monthly product
   - Package type: **Annual** — attach the annual product
3. Set this offering as **Current** (default)

### 2.7 Paste keys into codebase

Open `frontend/src/config/revenuecat.ts`:

```typescript
// Replace these two lines:
export const RC_IOS_API_KEY     = 'appl_YOUR_REAL_IOS_KEY_HERE';
export const RC_ANDROID_API_KEY = 'goog_YOUR_REAL_ANDROID_KEY_HERE';

// Confirm this matches your dashboard entitlement:
export const RC_ENTITLEMENT_ID  = 'pro';

// Confirm these match your offering package identifiers:
export const RC_MONTHLY_PACKAGE_ID = '$rc_monthly';
export const RC_ANNUAL_PACKAGE_ID  = '$rc_annual';

// Update fallback prices to match store prices:
export const FALLBACK_MONTHLY_PRICE        = '$4.99/mo';
export const FALLBACK_ANNUAL_PRICE         = '$29.99/yr';
export const FALLBACK_ANNUAL_MONTHLY_EQUIV = '$2.50/mo';
```

---

## Part 3 — App Store Connect Setup (iOS)

### 3.1 Create your app

1. Go to https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: Discipline OS
   - Bundle ID: your bundle identifier from step 1.1
   - SKU: any unique string (e.g., `discipline-os-001`)

### 3.2 Create subscription products

In your app → **Features** → **In-App Purchases** → **+**:
1. **Subscription** → **Auto-Renewable Subscription**
2. Create a **Subscription Group** named "Discipline OS Pro"
3. Add product 1:
   - Reference Name: Discipline OS Pro Monthly
   - Product ID: `com.yourcompany.disciplineos.pro.monthly`
   - Duration: 1 Month
   - Price: $4.99
4. Add product 2:
   - Reference Name: Discipline OS Pro Annual
   - Product ID: `com.yourcompany.disciplineos.pro.annual`
   - Duration: 1 Year
   - Price: $29.99

### 3.3 App Privacy

Go to your app → **App Privacy** → fill in all data collection fields.
Subscriptions require disclosure of any purchase identifiers collected.

### 3.4 App Store listing metadata

Required before submission:
- App description (minimum 10 words)
- Keywords (100 character limit)
- Support URL (required)
- Privacy Policy URL (required for subscriptions)
- Screenshots:
  - 6.7" iPhone (required)
  - 6.5" iPhone (optional but recommended)
  - 12.9" iPad (if `supportsTablet: true`)

---

## Part 4 — Google Play Console Setup (Android)

### 4.1 Create your app

1. Go to https://play.google.com/console
2. **Create app** → fill in app name, default language, App/Game toggle, Free/Paid
3. Complete all policy declarations

### 4.2 Create subscription products

In your app → **Monetize** → **Subscriptions** → **Create subscription**:
1. Product ID: `pro_monthly`
2. Name: Discipline OS Pro Monthly
3. Add base plan → recurring period: monthly, price: $4.99
4. Activate

Repeat for annual:
1. Product ID: `pro_annual`
2. Name: Discipline OS Pro Annual
3. Add base plan → recurring period: annually, price: $29.99
4. Activate

### 4.3 Privacy policy

Google Play requires a privacy policy URL for all apps. Add it under **Store presence** → **Store listing**.

---

## Part 5 — EAS Build Commands

All commands run from the `frontend/` directory:

```bash
cd frontend
```

### 5.1 Development build (custom dev client — for real device testing)

```bash
# iOS (physical device)
eas build --profile development --platform ios

# Android (APK for physical device)
eas build --profile development --platform android

# Both platforms simultaneously
eas build --profile development --platform all
```

After the build completes:
- iOS: Scan the QR code or download the `.ipa` → install via TestFlight or direct device install
- Android: Download the `.apk` → install directly on your device

### 5.2 Preview build (internal testing without store submission)

```bash
# Good for sharing with testers before production
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

### 5.3 Production build (store submission)

```bash
# iOS → creates .ipa for App Store
eas build --profile production --platform ios

# Android → creates .aab for Google Play
eas build --profile production --platform android
```

### 5.4 Submit to stores

After a successful production build:

```bash
# iOS
eas submit --profile production --platform ios

# Android
eas submit --profile production --platform android
```

For Android submit, you need a Google Play service account JSON key.
Set the path in `eas.json` → `submit.production.android.serviceAccountKeyPath`.
Instructions: https://github.com/expo/fyi/blob/main/creating-google-service-account.md

---

## Part 6 — Device Testing Flow

### 6.1 Install the development build

After `eas build --profile development` completes:

1. On iOS: Add your device UDID to your Apple Developer account, then install via EAS or TestFlight
2. On Android: Enable "Unknown sources", download the APK, install it

### 6.2 Connect to the dev server

With the development build installed on device:

```bash
# Start the local Metro bundler with tunnel (so device can reach it)
cd frontend
npx expo start --dev-client
```

Scan the QR code from your phone to connect.

### 6.3 Test checklist on device

**RevenueCat / Subscriptions:**
- [ ] Open Settings → "Upgrade to Pro" → Paywall opens
- [ ] Paywall shows real prices from App Store / Play Store (not fallback prices)
- [ ] Tap "Start Yearly Plan" → native purchase sheet appears
- [ ] Complete purchase with sandbox account → "Welcome to Pro!" alert
- [ ] Settings now shows PRO badge
- [ ] Tap "Restore Purchases" → alert confirms restored (or "Nothing Found")
- [ ] Cancel mid-purchase → no error alert (silent no-op)

**Notifications:**
- [ ] During onboarding, tap "Enable Notifications" → system permission prompt appears
- [ ] Grant permission → permission granted state in Settings
- [ ] Create a reminder → notification fires at the scheduled time
- [ ] Edit a reminder → notification reschedules correctly
- [ ] Toggle reminder off → notification cancels
- [ ] Toggle reminder on → notification reschedules

**Core flows:**
- [ ] Create goal → add milestones → add steps → toggle completions
- [ ] Create non-negotiable task → mark complete → streak increments next day
- [ ] Plan a one-time task for tomorrow → shows in Home upcoming section
- [ ] History shows correct day variants after real usage

---

## Part 7 — Legal Requirements Before Submission

Both stores require a **Privacy Policy URL** for apps with subscriptions.

Create a simple Privacy Policy page covering:
- What data is collected (email if user creates account, purchase history via RevenueCat)
- How it is used
- Third-party services: RevenueCat (payments), Expo/EAS (build hosting)
- Data deletion contact

Recommended free option: https://app.termly.io — generates compliant policies.

Also create a **Support URL** (can be a simple landing page or email mailto link).

---

## Part 8 — Configuration Checklist

Before running your first EAS build, confirm:

- [ ] `frontend/app.json` → `ios.bundleIdentifier` is set (not placeholder)
- [ ] `frontend/app.json` → `android.package` is set (not placeholder)
- [ ] `eas init` has been run (sets `owner` + `extra.eas.projectId` automatically)
- [ ] `frontend/src/config/revenuecat.ts` → real iOS + Android SDK keys
- [ ] `frontend/src/config/revenuecat.ts` → entitlement ID matches RevenueCat dashboard
- [ ] `frontend/assets/images/icon.png` → replaced with final 1024×1024 RGB PNG (no alpha)
- [ ] `frontend/assets/images/adaptive-icon.png` → replaced with 1024×1024 PNG
- [ ] `frontend/assets/images/splash-image.png` → replaced with final splash
- [ ] App Store Connect app created with matching bundle ID
- [ ] Google Play app created with matching package name
- [ ] Subscription products created in both stores
- [ ] RevenueCat entitlement, offering, and packages configured
- [ ] Privacy Policy URL ready
- [ ] Support URL ready

---

## Part 9 — Key File Reference

| What to change | File |
|---|---|
| Bundle ID / Package name | `frontend/app.json` → `ios.bundleIdentifier`, `android.package` |
| URL scheme | `frontend/app.json` → `scheme` (currently `disciplineos`) |
| Build profiles | `frontend/eas.json` |
| RevenueCat keys | `frontend/src/config/revenuecat.ts` |
| App icon | `frontend/assets/images/icon.png` |
| Android adaptive icon | `frontend/assets/images/adaptive-icon.png` |
| Splash screen | `frontend/assets/images/splash-image.png` |
| App version | `frontend/app.json` → `version` |
| Notification color | `frontend/app.json` → plugins → expo-notifications → color |
| Splash background | `frontend/app.json` → plugins → expo-splash-screen → backgroundColor |

---

## Part 10 — Troubleshooting Common EAS Issues

**"No bundle identifier"**
→ Set `ios.bundleIdentifier` in `app.json` and run `eas init`

**"Missing Google Service Account"**
→ Follow: https://github.com/expo/fyi/blob/main/creating-google-service-account.md

**"Purchases not initialized" on device**
→ RevenueCat placeholder keys are still in `revenuecat.ts`. Replace with real keys.

**"No offerings available"**
→ RevenueCat dashboard: confirm an offering is set as Current and products are attached to packages.

**"Permission denied" for notifications on device**
→ iOS: Check device Settings → Notifications → Discipline OS. Android: Check app permissions.

**"shadow* deprecated" warning**
→ Fully resolved in codebase. Any remaining warnings come from `expo-notifications` third-party library.

**`newArchEnabled: true` with react-native-purchases**
→ react-native-purchases v9 supports new architecture. If you encounter issues, set `newArchEnabled: false` in `app.json` as a temporary workaround.
