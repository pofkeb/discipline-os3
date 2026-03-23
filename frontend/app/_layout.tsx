import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create-goal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="create-task" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="create-reminder" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="goal/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
