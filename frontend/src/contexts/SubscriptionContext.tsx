/**
 * SubscriptionContext
 *
 * Wraps RevenueCat purchases SDK with:
 * - Graceful fallback for web / Expo Go (where native SDK is not linked)
 * - Preserved existing interface (plan, isPro, purchasePackage, restorePurchases, isLoading)
 * - Extended with `offerings` and `rcAvailable` for paywall real-price display
 * - RC account linking: calls Purchases.logIn(user.id) on login/register and
 *   Purchases.logOut() on logout so purchases are always tied to the correct identity
 *
 * Behavior by environment:
 *   Native EAS build  → real RevenueCat SDK (real billing + account linking)
 *   Expo Go           → RC configure throws → fallback to AsyncStorage mock
 *   Web               → no RC attempt       → fallback to AsyncStorage mock
 *   Placeholder keys  → RC skipped          → fallback to AsyncStorage mock
 *
 * Account linking flow:
 *   Guest user purchases Pro:
 *     → purchase recorded on RC anonymous ID
 *   Guest user then creates account / logs in:
 *     → Purchases.logIn(user.id) merges the anonymous purchase into their account
 *     → isPro stays true, no entitlement loss
 *   User logs out:
 *     → Purchases.logOut() resets RC to a fresh anonymous ID
 *   Returning logged-in user opens app:
 *     → RC initialises (anonymous), then logIn(user.id) fires once auth loads
 *     → correct entitlements restored from their account
 */

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  getRevenueCatApiKey,
  RC_ENTITLEMENT_ID,
  RC_MONTHLY_PACKAGE_ID,
  RC_ANNUAL_PACKAGE_ID,
} from '../config/revenuecat';
import { useAuth } from './AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Plan    = 'free' | 'pro';
type Package = 'monthly' | 'yearly';

// These types are safe to reference even without native module linked —
// they are only type-level imports.
type RCCustomerInfo       = import('react-native-purchases').CustomerInfo;
type RCOfferings          = import('react-native-purchases').PurchasesOfferings;
type RCPackage            = import('react-native-purchases').PurchasesPackage;
type RCListener           = import('react-native-purchases').CustomerInfoUpdateListener;

export type SubscriptionContextType = {
  // ── Existing interface (preserved exactly) ─────────────────────────────────
  plan:             Plan;
  isPro:            boolean;
  purchasePackage:  (pkg: Package) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  isLoading:        boolean;
  // ── Extended (new – used by paywall for real prices) ───────────────────────
  offerings:        RCOfferings | null;
  rcAvailable:      boolean;
};

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

// ─── Environment detection ──────────────────────────────────────────────────────

/**
 * RevenueCat requires native module linking.
 * It is NOT available in:
 *   - Web builds
 *   - Expo Go (storeClient execution environment)
 */
function isRcEnvironmentSupported(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

// ─── Provider ───────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();

  const [rcConfigured,  setRcConfigured]  = useState(false);
  const [customerInfo,  setCustomerInfo]  = useState<RCCustomerInfo | null>(null);
  const [offerings,     setOfferings]     = useState<RCOfferings | null>(null);
  const [localPlan,     setLocalPlan]     = useState<Plan>('free');
  const [isLoading,     setIsLoading]     = useState(false);

  const listenerRef    = useRef<RCListener | null>(null);
  // Tracks the RC-identified user ID so we know when to call logIn / logOut
  const prevUserIdRef  = useRef<string | null>(null);

  // ── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    initSubscription();
    return cleanupListener;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── RC account linking ────────────────────────────────────────────────────────
  // Fires whenever auth state or rcConfigured changes.
  // Keeps RC's identity in sync with the app's auth state so purchases
  // made as a guest are linked to the account after login/register, and
  // are correctly loaded on every subsequent cold start.

  useEffect(() => {
    if (!rcConfigured) return;

    if (!isGuest && user?.id) {
      // User logged in or registered (and RC is ready)
      if (prevUserIdRef.current !== user.id) {
        prevUserIdRef.current = user.id;
        syncRcLogin(user.id);
      }
    } else if (isGuest && prevUserIdRef.current !== null) {
      // User explicitly logged out (was previously identified in RC)
      prevUserIdRef.current = null;
      syncRcLogout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isGuest, rcConfigured]);

  /**
   * Tell RC who the user is.
   * logIn() merges any anonymous purchase history into the identified account,
   * then returns the merged CustomerInfo. isPro updates accordingly.
   */
  async function syncRcLogin(userId: string) {
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const { customerInfo } = await Purchases.logIn(userId);
      setCustomerInfo(customerInfo);
      if (__DEV__) console.log('[RC] logIn complete for user:', userId);
    } catch (err) {
      // Silently ignored: web, Expo Go, placeholder keys, or network error.
      if (__DEV__) console.warn('[RC] logIn failed (non-fatal):', err);
    }
  }

  /**
   * Reset RC to a fresh anonymous user.
   * Called when the user signs out so their entitlements no longer show.
   */
  async function syncRcLogout() {
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const freshCustomerInfo = await Purchases.logOut();
      setCustomerInfo(freshCustomerInfo);
      if (__DEV__) console.log('[RC] logOut complete — reset to anonymous');
    } catch (err) {
      if (__DEV__) console.warn('[RC] logOut failed (non-fatal):', err);
    }
  }

  function cleanupListener() {
    if (listenerRef.current) {
      import('react-native-purchases')
        .then(({ default: Purchases }) => {
          if (listenerRef.current) {
            Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
            listenerRef.current = null;
          }
        })
        .catch(() => {});
    }
  }

  async function initSubscription() {
    // 1. Always load local fallback first (instant, no network needed)
    const stored = await AsyncStorage.getItem('subscription_plan');
    if (stored === 'pro') setLocalPlan('pro');

    // 2. Check environment support
    if (!isRcEnvironmentSupported()) {
      if (__DEV__) console.log('[RC] Skipping RevenueCat: unsupported environment (web / Expo Go)');
      return;
    }

    // 3. Check keys are not placeholders
    const apiKey = getRevenueCatApiKey();
    if (!apiKey || apiKey.includes('XXXXXXXXX')) {
      // TODO: Replace placeholder keys in src/config/revenuecat.ts to enable real billing
      if (__DEV__) console.warn('[RC] Placeholder API key — real billing disabled. Update src/config/revenuecat.ts');
      return;
    }

    // 4. Configure RevenueCat
    try {
      const { default: Purchases } = await import('react-native-purchases');

      // configure() is synchronous in v9
      Purchases.configure({ apiKey });

      if (__DEV__) {
        Purchases.setLogLevel('DEBUG' as any);
      }

      // 5. Fetch initial data
      const [info, offeringsData] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      setCustomerInfo(info);
      setOfferings(offeringsData);
      setRcConfigured(true);

      // 6. Listen for subscription changes (purchase, renewal, webhook)
      const listener: RCListener = (updated: RCCustomerInfo) => {
        setCustomerInfo(updated);
      };
      listenerRef.current = listener;
      Purchases.addCustomerInfoUpdateListener(listener);

    } catch (err) {
      // Expected in Expo Go or when keys are wrong — fall back silently
      if (__DEV__) console.warn('[RC] Init failed — using local fallback:', err);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isProRC = !!(customerInfo?.entitlements?.active?.[RC_ENTITLEMENT_ID]);
  const isPro   = rcConfigured ? isProRC : localPlan === 'pro';
  const plan    = useMemo<Plan>(() => (isPro ? 'pro' : 'free'), [isPro]);

  // ── purchasePackage ───────────────────────────────────────────────────────────

  async function purchasePackage(pkg: Package): Promise<void> {
    setIsLoading(true);
    try {
      if (rcConfigured && offerings) {
        // ── Real RevenueCat purchase ─────────────────────────────────────────
        const { default: Purchases, PURCHASES_ERROR_CODE } = await import('react-native-purchases');

        const current = offerings.current;
        if (!current) {
          throw new Error(
            'No RevenueCat offering found. Check that your offering is configured and set as default in the RevenueCat dashboard.'
          );
        }

        // Prefer shorthand accessors (annual/monthly), fall back to package ID lookup
        let rcPkg: RCPackage | null = null;
        if (pkg === 'yearly') {
          rcPkg =
            current.annual ??
            current.availablePackages.find(p => p.identifier === RC_ANNUAL_PACKAGE_ID) ??
            null;
        } else {
          rcPkg =
            current.monthly ??
            current.availablePackages.find(p => p.identifier === RC_MONTHLY_PACKAGE_ID) ??
            null;
        }

        if (!rcPkg) {
          throw new Error(
            `No "${pkg}" package found in current offering. Add a ${pkg === 'yearly' ? 'annual' : 'monthly'} package in the RevenueCat dashboard.`
          );
        }

        try {
          const result = await Purchases.purchasePackage(rcPkg);
          setCustomerInfo(result.customerInfo);
        } catch (purchaseErr: any) {
          // User tapped "Cancel" — treat as silent no-op, not an error
          if (
            purchaseErr?.userCancelled === true ||
            purchaseErr?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
          ) {
            return;
          }
          throw purchaseErr;
        }

      } else {
        // ── Fallback mock (Expo Go / web / placeholder keys) ─────────────────
        // TODO: This mock path disappears automatically once real RC keys are live.
        await new Promise<void>(r => setTimeout(r, 1500));
        await AsyncStorage.setItem('subscription_plan', 'pro');
        await AsyncStorage.setItem('subscription_package', pkg);
        setLocalPlan('pro');
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ── restorePurchases ─────────────────────────────────────────────────────────

  async function restorePurchases(): Promise<boolean> {
    setIsLoading(true);
    try {
      if (rcConfigured) {
        // ── Real RevenueCat restore ──────────────────────────────────────────
        const { default: Purchases } = await import('react-native-purchases');
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        return !!(info.entitlements?.active?.[RC_ENTITLEMENT_ID]);
      } else {
        // ── Fallback mock ────────────────────────────────────────────────────
        await new Promise<void>(r => setTimeout(r, 800));
        const stored = await AsyncStorage.getItem('subscription_plan');
        if (stored === 'pro') {
          setLocalPlan('pro');
          return true;
        }
        return false;
      }
    } catch (err) {
      if (__DEV__) console.warn('[RC] Restore failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // ── Context value ─────────────────────────────────────────────────────────────

  const contextValue = useMemo<SubscriptionContextType>(
    () => ({
      plan,
      isPro,
      purchasePackage,
      restorePurchases,
      isLoading,
      offerings,
      rcAvailable: rcConfigured,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, isPro, isLoading, offerings, rcConfigured]
  );

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

// ─── Limits helpers (unchanged) ────────────────────────────────────────────────

const FREE_LIMITS = { maxGoals: 1, maxTasks: 10, maxReminders: 3 };
const PRO_LIMITS  = { maxGoals: 999, maxTasks: 999, maxReminders: 999 };

export function getLimits(plan: Plan) {
  return plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}
