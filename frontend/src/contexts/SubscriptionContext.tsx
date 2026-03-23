import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Plan = 'free' | 'pro';
type Package = 'monthly' | 'yearly';

type SubscriptionContextType = {
  plan: Plan;
  isPro: boolean;
  purchasePackage: (pkg: Package) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
};

const FREE_LIMITS = {
  maxGoals: 1,
  maxTasks: 10,
  maxReminders: 3,
};

const PRO_LIMITS = {
  maxGoals: 999,
  maxTasks: 999,
  maxReminders: 999,
};

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    const stored = await AsyncStorage.getItem('subscription_plan');
    if (stored === 'pro') setPlan('pro');
  };

  const purchasePackage = async (pkg: Package) => {
    setIsLoading(true);
    // Mock purchase delay
    await new Promise(r => setTimeout(r, 1500));
    await AsyncStorage.setItem('subscription_plan', 'pro');
    await AsyncStorage.setItem('subscription_package', pkg);
    setPlan('pro');
    setIsLoading(false);
  };

  const restorePurchases = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const stored = await AsyncStorage.getItem('subscription_plan');
    setIsLoading(false);
    if (stored === 'pro') {
      setPlan('pro');
      return true;
    }
    return false;
  };

  return (
    <SubscriptionContext.Provider value={{ plan, isPro: plan === 'pro', purchasePackage, restorePurchases, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

export function getLimits(plan: Plan) {
  return plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}
