import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(onboarding)/start');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Progress dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '12' }]}>
            <Ionicons name="flash" size={48} color={colors.accent} />
          </View>

          {/* Brand */}
          <Text style={[styles.brand, { color: colors.accent }]}>DISCIPLINE</Text>
          <Text style={[styles.brandSub, { color: colors.textPrimary }]}>OS</Text>

          {/* Tagline */}
          <Text style={[styles.tagline, { color: colors.textPrimary }]}>
            Build your system.{'\n'}Own your day.
          </Text>

          {/* Description */}
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Create goals, track milestones, build streaks, and stay disciplined — all in one place.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.bottom}>
          <TouchableOpacity
            testID="onboarding-continue-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>GET STARTED</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  brand: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.hero, letterSpacing: 3 },
  brandSub: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.display, marginTop: -8 },
  tagline: { fontFamily: 'Inter_700Bold', fontSize: fontSize.xl, textAlign: 'center', marginTop: spacing.xl, lineHeight: 30 },
  desc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.md, lineHeight: 24, paddingHorizontal: spacing.md },
  bottom: { paddingBottom: spacing.xl },
  button: { height: 56, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
});
