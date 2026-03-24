# Discipline OS — Release Checklist & Handoff

## 1. Where to Paste RevenueCat Keys

**File: `frontend/src/config/revenuecat.ts`**

Open that file and replace the four placeholder values:

```typescript
// Line ~18
export const RC_IOS_API_KEY = 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
//                             ^^^^ Replace with your iOS Public SDK Key

// Line ~23
export const RC_ANDROID_API_KEY = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
//                                  ^^^^ Replace with your Android Public SDK Key

// Line ~29
export const RC_ENTITLEMENT_ID = 'pro';
// ↑ Change only if you named your entitlement something other than "pro"

// Lines ~35-36
export const RC_MONTHLY_PACKAGE_ID = '$rc_monthly';
export const RC_ANNUAL_PACKAGE_ID  = '$rc_annual';
// ↑ Change only if you used custom package identifiers (not RevenueCat predefined ones)
```

**Where to find the keys:**
- https://app.revenuecat.com → Project → API Keys → Public App Specific Keys
- iOS key starts with `appl_`
- Android key starts with `goog_`

---

## 2. RevenueCat Dashboard Identifiers You Must Confirm

| Item | What to Check | Default Assumed |
|---|---|---|
| Entitlement identifier | Settings → Entitlements | `pro` |
| Current offering identifier | Offerings → mark one as "Current" | `$rc_default` (auto) |
| Monthly package identifier | Inside the offering | `$rc_monthly` (predefined) |
| Annual package identifier | Inside the offering | `$rc_annual` (predefined) |

If you used custom identifiers (e.g., `discipline_pro_monthly`), update the `RC_MONTHLY_PACKAGE_ID` / `RC_ANNUAL_PACKAGE_ID` constants in `revenuecat.ts`.

---

## 3. Store Products & Entitlements You Need to Create

### App Store Connect (iOS)
1. Create two **Auto-Renewable Subscriptions** in your app:
   - Product ID: `com.yourapp.pro.monthly` (or similar)
   - Product ID: `com.yourapp.pro.annual` (or similar)
2. Set prices: Monthly = ~$4.99, Annual = ~$29.99 (match `FALLBACK_*_PRICE` in `revenuecat.ts` if you change them)
3. Submit for App Store review when ready

### Google Play Console (Android)
1. Create a **Subscription** product with two base plans:
   - Monthly base plan
   - Annual base plan
2. Activate the products

### RevenueCat Dashboard
1. Create **Products**: attach the App Store + Play Store product IDs above
2. Create **Entitlement** named `pro` → attach both products to it
3. Create **Offering** → add two **Packages**:
   - Package type: Monthly → attach monthly product
   - Package type: Annual → attach annual product
4. Set the offering as **Current** (default)

---

## 4. What Requires EAS Build / Physical Device

| Feature | Preview (web/Expo Go) | EAS Build + Device |
|---|---|---|
| App UI rendering | ✅ Works | ✅ Works |
| Local data (tasks, goals, history) | ✅ Works | ✅ Works |
| Fallback mock subscription | ✅ Works | ✅ Works |
| RevenueCat SDK initializes | ❌ Falls back silently | ✅ Real RC |
| Purchase sheet (App Store / Play) | ❌ Mock 1.5s delay | ✅ Real billing |
| Restore purchases via RC | ❌ Reads AsyncStorage | ✅ Real restore |
| Entitlement-based `isPro` | ❌ Uses AsyncStorage | ✅ RC receipt |
| Push notification scheduling | ❌ Skipped on web | ✅ Works |
| Reminder notification delivery | ❌ Web not supported | ✅ Works |

**To build with EAS:**
```bash
cd frontend
npx eas build --platform ios --profile development   # custom dev client
npx eas build --platform android --profile development
```

---

## 5. Exact Steps to Test Purchases and Restores

### Prerequisites
- Real iOS device enrolled in App Store Connect sandbox, OR
- Real Android device with Google Play sandbox account
- EAS development build installed (not Expo Go)
- RevenueCat dashboard set up with products (Section 3 above)
- Real API keys in `revenuecat.ts` (Section 1 above)

### Test Purchase Flow
1. Launch the app on device
2. Open **Settings** → tap "Upgrade to Pro" → Paywall opens
3. Select a plan (Yearly or Monthly)
4. Tap "START YEARLY PLAN"
5. The native App Store / Play Store purchase sheet should appear
6. Complete purchase with sandbox credentials
7. Expected: Alert "Welcome to Pro!" → Settings shows PRO badge
8. Check RevenueCat dashboard → Customer should appear with active entitlement

### Test Restore Flow
1. Delete the app or sign out of sandbox account
2. Re-install / re-launch
3. Open **Settings** → "Restore Purchases"
4. Expected: Alert "Restored — Your Pro subscription has been restored."
   Or: "Nothing Found" if no prior purchase exists

### Test User Cancellation
1. Open Paywall → tap purchase button
2. When native purchase sheet appears, tap Cancel
3. Expected: Sheet dismisses, NO error alert, paywall stays open

### Test Fallback (Expo Go / Web)
1. Open the app in Expo Go or web browser
2. Open Paywall → prices show fallback values + "Preview mode" notice
3. Tap purchase → 1.5s delay → "Welcome to Pro!" (mock)
4. `isPro` becomes true via AsyncStorage

---

## 6. Pre-Release Checklist

### Code & Integration
- [x] RevenueCat SDK (`react-native-purchases` v9.14.0) installed
- [x] `SubscriptionContext` uses real RC on native, fallback on web/Expo Go
- [x] Paywall shows real prices from RC offerings (or fallback)
- [x] User cancellation handled silently (no error shown)
- [x] Entitlement check: `customerInfo.entitlements.active['pro']`
- [x] Restore purchases calls `Purchases.restorePurchases()` on native
- [x] `ReminderIntervalType` unified across `notifications.ts`, `api.ts`, `tasks.tsx`, `create-reminder.tsx`
- [ ] Replace placeholder keys in `revenuecat.ts`
- [ ] Confirm entitlement/offering/package identifiers match dashboard

### Store Setup
- [ ] App Store Connect: subscription products created
- [ ] Google Play Console: subscription products created
- [ ] RevenueCat: products, entitlements, offerings configured
- [ ] RevenueCat: offering set as Current

### Assets & Metadata
- [ ] App icon (1024×1024 PNG, no alpha for iOS)
- [ ] Splash screen final version
- [ ] App Store screenshots (6.7" iPhone, 12.9" iPad minimum)
- [ ] App description, keywords, category set in App Store Connect
- [ ] Privacy Policy URL (required for subscriptions)
- [ ] Terms of Service URL (required for subscriptions)
- [ ] Support URL

### Device QA
- [ ] Reminder notifications fire on physical device (iOS + Android)
- [ ] Reminder edit flow works correctly on device
- [ ] Planner date prefill works correctly
- [ ] History/calendar shows correct past data
- [ ] Streak calculation correct after full day cycle
- [ ] Purchase flow tested with sandbox account
- [ ] Restore purchases tested
- [ ] Light mode and dark mode verified

### Known Remaining Warnings (Non-Blocking)
- `shadow*` style warnings in `app/(auth)/login.tsx` and `register.tsx` (web only, cosmetic)
  → Fix when touching auth screens; replace with `Platform.select({ ios: { shadowColor... }, android: { elevation... } })`
- `expo-notifications` web push token listener warning (expected, web doesn't support push)

---

## 7. File Map for Quick Reference

| What | File |
|---|---|
| RevenueCat keys + identifiers | `frontend/src/config/revenuecat.ts` |
| Subscription logic (RC + fallback) | `frontend/src/contexts/SubscriptionContext.tsx` |
| Paywall UI | `frontend/app/paywall.tsx` |
| Reminder type definitions | `frontend/src/services/notifications.ts` → `ReminderIntervalType` |
| Theme / design tokens | `frontend/src/constants/theme.ts` |
| Local data layer | `frontend/src/services/localStore.ts` |
