import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useThemeColors } from '../src/constants/theme';
import { isOnboardingComplete } from '../src/services/localStore';

export default function Index() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      checkRoute();
    }
  }, [isLoading]);

  const checkRoute = async () => {
    const onboarded = await isOnboardingComplete();
    if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)/welcome');
    }
    setChecking(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
