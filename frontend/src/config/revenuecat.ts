/**
 * RevenueCat Configuration
 *
 * HOW TO SET UP:
 * 1. Create a RevenueCat project at https://app.revenuecat.com
 * 2. Add your iOS app (Bundle ID) and Android app (Package Name)
 * 3. Create an Entitlement called "pro" (or update RC_ENTITLEMENT_ID below)
 * 4. Create an Offering with monthly + annual packages
 * 5. Create products in App Store Connect / Google Play Console
 * 6. Attach products to packages in the RevenueCat dashboard
 * 7. Replace the placeholder keys below with your real SDK keys
 */

import { Platform } from 'react-native';

// ─── SDK Keys ─────────────────────────────────────────────────────────────────
// TODO: Replace with your RevenueCat Public SDK Key for iOS
// Found at: https://app.revenuecat.com → Project Settings → API Keys → Public App Specific Keys
export const RC_IOS_API_KEY = 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// TODO: Replace with your RevenueCat Public SDK Key for Android
// Found at: https://app.revenuecat.com → Project Settings → API Keys → Public App Specific Keys
export const RC_ANDROID_API_KEY = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// ─── Entitlement Identifier ───────────────────────────────────────────────────
// TODO: Verify this matches the entitlement identifier in your RevenueCat dashboard
// Default recommendation: 'pro'
export const RC_ENTITLEMENT_ID = 'pro';

// ─── Offering / Package Identifiers ──────────────────────────────────────────
// TODO: Verify these match the offering/package identifiers in your RevenueCat dashboard
// RevenueCat predefined identifiers: '$rc_monthly', '$rc_annual', '$rc_lifetime'
// Custom identifiers should match what you set in the dashboard.
export const RC_DEFAULT_OFFERING_ID = '$rc_default'; // The current/default offering identifier
export const RC_MONTHLY_PACKAGE_ID  = '$rc_monthly'; // Monthly package identifier
export const RC_ANNUAL_PACKAGE_ID   = '$rc_annual';  // Annual (yearly) package identifier

// ─── Fallback Prices ──────────────────────────────────────────────────────────
// Shown in Expo Go / web preview when RevenueCat SDK is not available.
// These must match the prices you configure in App Store / Google Play.
export const FALLBACK_MONTHLY_PRICE          = '$4.99/mo';
export const FALLBACK_ANNUAL_PRICE           = '$29.99/yr';
export const FALLBACK_ANNUAL_MONTHLY_EQUIV   = '$2.50/mo';

// ─── Future Offer Identifiers ─────────────────────────────────────────────────
// RevenueCat supports multiple named offerings for intro / promo / win-back flows.
// Create these in the RC dashboard, then activate with:
//   const offer = offerings?.all[RC_INTRO_OFFERING_ID] ?? offerings?.current;
//   // use offer.monthly / offer.annual / offer.availablePackages as usual
//
// TODO: Configure these in your RC dashboard before activating them in the paywall.
export const RC_INTRO_OFFERING_ID   = 'intro_offer';   // Trial / introductory pricing
export const RC_PROMO_OFFERING_ID   = 'promo_offer';   // Promotional / seasonal discount
export const RC_WINBACK_OFFERING_ID = 'winback_offer'; // Re-engagement / win-back campaign

// ─── Paywall hit tracking ─────────────────────────────────────────────────────
// Tracks how many times a free user has hit a usage limit.
// The paywall uses this to show stronger copy on repeat encounters.
const PAYWALL_HITS_KEY = '@dos/paywall_hits';

/**
 * Increments and returns the cumulative paywall hit count for this device.
 * Safe to call before every `router.push('/paywall')`.
 */
export async function incrementPaywallHits(): Promise<number> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const stored = await AsyncStorage.getItem(PAYWALL_HITS_KEY);
    const next   = (stored ? parseInt(stored, 10) : 0) + 1;
    await AsyncStorage.setItem(PAYWALL_HITS_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
/**
 * Returns the correct platform-specific RevenueCat API key.
 * Web returns null because RC is not available on web.
 */
export function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios')     return RC_IOS_API_KEY;
  if (Platform.OS === 'android') return RC_ANDROID_API_KEY;
  return null; // web / unsupported
}
