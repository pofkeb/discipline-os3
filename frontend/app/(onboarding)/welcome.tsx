import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const c = useThemeColors();
  const router = useRouter();

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(onboarding)/start');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <View style={s.container}>
        {/* Progress indicator */}
        <View style={s.progressWrap}>
          <View style={[s.progressDot, { backgroundColor: c.accent }]} />
          <View style={[s.progressDot, { backgroundColor: c.border }]} />
          <View style={[s.progressDot, { backgroundColor: c.border }]} />
        </View>

        {/* Hero content */}
        <View style={s.hero}>
          {/* Icon badge */}
          <View style={[s.iconBadge, { backgroundColor: c.accent + '0F' }]}>
            <Ionicons name="flash" size={40} color={c.accent} />
          </View>

          {/* Brand */}
          <View style={s.brandBlock}>
            <Text style={[s.brandMain, { color: c.accent }]}>DISCIPLINE</Text>
            <Text style={[s.brandSub, { color: c.textPrimary }]}>OS</Text>
          </View>

          {/* Tagline */}
          <Text style={[s.tagline, { color: c.textPrimary }]}>
            Build your system.{'\n'}Own your day.
          </Text>

          {/* Description */}
          <Text style={[s.desc, { color: c.textSecondary }]}>
            Create goals, track milestones, build streaks,{'\n'}and stay disciplined — all in one place.
          </Text>
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            testID="onboarding-continue-btn"
            style={[s.ctaBtn, { backgroundColor: c.accent }]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={s.ctaText}>GET STARTED</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl },

  progressWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.lg,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },

  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandMain: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.hero,
    letterSpacing: 4,
    lineHeight: fontSize.hero,
  },
  brandSub: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.display,
    marginTop: -4,
  },

  tagline: {
    fontFamily: 'Inter_700Bold',
    fontSize: fontSize.xl,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.md,
  },

  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  ctaWrap: {
    paddingBottom: spacing.xxl,
  },
  ctaBtn: {
    height: 54,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.lg,
    letterSpacing: 1.5,
  },
});
