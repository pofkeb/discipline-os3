import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import {
  FALLBACK_MONTHLY_PRICE,
  FALLBACK_ANNUAL_PRICE,
  FALLBACK_ANNUAL_MONTHLY_EQUIV,
} from '../src/config/revenuecat';
import * as Haptics from 'expo-haptics';

// ─── Feature list ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'trophy-outline',           text: 'Unlimited goals & milestones' },
  { icon: 'checkmark-done-outline',   text: 'Unlimited daily tasks' },
  { icon: 'notifications-outline',    text: 'Unlimited reminders' },
  { icon: 'bar-chart-outline',        text: 'Progress stats & streak tracking' },
  { icon: 'calendar-outline',         text: 'Full history & calendar view' },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const colors  = useThemeColors();
  const router  = useRouter();
  const { purchasePackage, restorePurchases, isLoading, offerings, rcAvailable } = useSubscription();
  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');

  // ── Route params (set by trigger sites) ────────────────────────────────────
  // reason: which limit was hit — 'goal_limit' | 'task_limit' | 'reminder_limit'
  // hits:   cumulative paywall encounter count — drives stronger copy on repeat hits
  const { reason, hits: hitsStr } = useLocalSearchParams<{ reason?: string; hits?: string }>();
  const hitCount    = hitsStr ? parseInt(hitsStr, 10) : 1;
  const isRepeatHit = hitCount >= 2;

  const contextMessage: string | null =
    reason === 'goal_limit'       ? 'You\'ve reached the 1-goal free limit'
    : reason === 'task_limit'     ? 'You\'ve reached the 10-task free limit'
    : reason === 'reminder_limit' ? 'You\'ve reached the 3-reminder free limit'
    : null;

  const heroTagline = isRepeatHit
    ? 'Remove the limits. Keep building.'
    : 'Unlock your full potential';

  // Second-chance motivation line — shown above plan selector on repeat hits only.
  // Honest, direct, zero fake urgency.
  const secondChanceMessage =
    reason === 'goal_limit'       ? 'Your ambition shouldn\'t have a ceiling. Go unlimited.'
    : reason === 'task_limit'     ? 'Real systems don\'t stop at 10 tasks. Go unlimited.'
    : reason === 'reminder_limit' ? 'Build your full routine without a reminder cap.'
    : 'You\'ve hit the free limit more than once. Remove it for good.';

  // ── Derive prices from RC offerings or fallback ────────────────────────────

  const { monthlyPrice, annualPrice, annualMonthlyEquiv } = useMemo(() => {
    if (rcAvailable && offerings?.current) {
      const monthly = offerings.current.monthly;
      const annual  = offerings.current.annual;
      return {
        monthlyPrice:        monthly?.product?.priceString  ?? FALLBACK_MONTHLY_PRICE,
        annualPrice:         annual?.product?.priceString   ?? FALLBACK_ANNUAL_PRICE,
        annualMonthlyEquiv:  annual?.product?.pricePerMonth
          ? `${annual.product.pricePerMonth}/mo`
          : FALLBACK_ANNUAL_MONTHLY_EQUIV,
      };
    }
    return {
      monthlyPrice:       FALLBACK_MONTHLY_PRICE,
      annualPrice:        FALLBACK_ANNUAL_PRICE,
      annualMonthlyEquiv: FALLBACK_ANNUAL_MONTHLY_EQUIV,
    };
  }, [rcAvailable, offerings]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await purchasePackage(selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Welcome to Pro!',
        'You now have unlimited access to all features.',
        [{ text: 'Start now', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Purchase Failed',
        err?.message ?? 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const restored = await restorePurchases();
    if (restored) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Restored', 'Your Pro subscription has been restored.', [
        { text: 'Continue', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Nothing Found', 'No previous purchases were found for this account.');
    }
  };

  // ── Styles (dynamic) ───────────────────────────────────────────────────────

  const s = useMemo(() => makeStyles(colors), [colors]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      {/* Close button */}
      <TouchableOpacity
        testID="close-paywall-btn"
        style={s.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        bounces={Platform.OS === 'ios'}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={[s.iconRing, { borderColor: colors.accent + '30', backgroundColor: colors.accent + '10' }]}>
            <Ionicons name="diamond" size={36} color={colors.accent} />
          </View>

          <Text style={[s.brandName, { color: colors.textPrimary }]}>DISCIPLINE OS</Text>
          <View style={[s.proBadge, { backgroundColor: colors.accent }]}>
            <Text style={s.proBadgeText}>PRO</Text>
          </View>
          {contextMessage && (
            <Text style={[s.contextMsg, { color: colors.accent }]}>{contextMessage}</Text>
          )}
          <Text style={[s.heroTagline, { color: colors.textSecondary }]}>
            {heroTagline}
          </Text>
        </View>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <View style={s.featuresBlock}>
          <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>WHAT YOU GET</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureIconWrap, { backgroundColor: colors.accent + '12' }]}>
                <Ionicons name={f.icon as any} size={15} color={colors.accent} />
              </View>
              <Text style={[s.featureText, { color: colors.textPrimary }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* ── Second-chance block (repeat hits only) ──────────────────────── */}
        {isRepeatHit && (
          <View style={[s.secondChance, { backgroundColor: colors.accent + '08', borderColor: colors.accent + '22' }]}>
            <Ionicons name="trending-up" size={15} color={colors.accent} />
            <Text style={[s.secondChanceText, { color: colors.textPrimary }]}>
              {secondChanceMessage}
            </Text>
          </View>
        )}

        {/* ── Plan selector ────────────────────────────────────────────────── */}
        <View style={s.plansBlock}>
          <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>CHOOSE YOUR PLAN</Text>

          {/* Yearly card */}
          <TouchableOpacity
            testID="yearly-plan-btn"
            style={[
              s.planCard,
              {
                borderColor:     selected === 'yearly' ? colors.accent : colors.border,
                backgroundColor: selected === 'yearly' ? colors.accent + '08' : colors.surface,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelected('yearly');
            }}
            activeOpacity={0.75}
          >
            <View style={s.planCardLeft}>
              <View style={s.planCardTitleRow}>
                <Text style={[s.planName, { color: colors.textPrimary }]}>Yearly</Text>
                <View style={[s.bestValueBadge, { backgroundColor: colors.accent }]}>
                  <Text style={s.bestValueText}>BEST VALUE</Text>
                </View>
              </View>
              <Text style={[s.planSubtitle, { color: colors.textTertiary }]}>
                {annualMonthlyEquiv} · billed annually
              </Text>
            </View>
            <View style={s.planCardRight}>
              <Text style={[s.planPrice, { color: colors.textPrimary }]}>{annualPrice}</Text>
            </View>
            {selected === 'yearly' && (
              <View style={[s.selectedDot, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Monthly card */}
          <TouchableOpacity
            testID="monthly-plan-btn"
            style={[
              s.planCard,
              {
                borderColor:     selected === 'monthly' ? colors.accent : colors.border,
                backgroundColor: selected === 'monthly' ? colors.accent + '08' : colors.surface,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelected('monthly');
            }}
            activeOpacity={0.75}
          >
            <View style={s.planCardLeft}>
              <Text style={[s.planName, { color: colors.textPrimary }]}>Monthly</Text>
              <Text style={[s.planSubtitle, { color: colors.textTertiary }]}>
                billed monthly
              </Text>
            </View>
            <View style={s.planCardRight}>
              <Text style={[s.planPrice, { color: colors.textPrimary }]}>{monthlyPrice}</Text>
            </View>
            {selected === 'monthly' && (
              <View style={[s.selectedDot, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Preview mode notice — dev/Expo Go only ───────────────────────── */}
        {__DEV__ && !rcAvailable && (
          <View style={[s.previewNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
            <Text style={[s.previewText, { color: colors.textTertiary }]}>
              Dev mode — prices are estimates. Real billing requires an EAS / native build.
            </Text>
          </View>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <TouchableOpacity
          testID="purchase-btn"
          style={[s.ctaBtn, { backgroundColor: colors.accent }, isLoading && s.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="diamond" size={16} color="#fff" style={{ marginRight: spacing.sm }} />
              <Text style={s.ctaBtnText}>
                {isRepeatHit
                  ? 'GET PRO NOW'
                  : `START ${selected === 'yearly' ? 'YEARLY' : 'MONTHLY'} PLAN`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <TouchableOpacity
          testID="restore-btn"
          onPress={handleRestore}
          disabled={isLoading}
          style={s.restoreBtn}
          activeOpacity={0.6}
        >
          <Text style={[s.restoreText, { color: colors.textTertiary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <Text style={[s.legalText, { color: colors.textTertiary }]}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the billing period.
          Cancel anytime in your App Store / Play Store account settings.
        </Text>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    closeBtn: {
      position: 'absolute',
      top: spacing.xl + spacing.sm,
      right: spacing.lg,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceHighlight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },

    // ── Hero ──────────────────────────────────────────────────────────────────
    hero: {
      alignItems: 'center',
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    iconRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    brandName: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: fontSize.display,
      letterSpacing: 3,
    },
    proBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      marginTop: spacing.sm,
    },
    proBadgeText: {
      color: '#fff',
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: fontSize.sm,
      letterSpacing: 2,
    },
    heroTagline: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.base,
      marginTop: spacing.md,
    },
    contextMsg: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: fontSize.sm,
      marginTop: spacing.md,
      textAlign: 'center',
    },

    // ── Second-chance block ───────────────────────────────────────────────────
    secondChance: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      marginBottom: spacing.lg,
    },
    secondChanceText: {
      fontFamily: 'Inter_500Medium',
      fontSize: fontSize.sm,
      flex: 1,
      lineHeight: 20,
    },

    // ── Divider ───────────────────────────────────────────────────────────────
    divider: {
      height: 1,
      marginVertical: spacing.xl,
    },

    // ── Features ──────────────────────────────────────────────────────────────
    featuresBlock: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontFamily: 'Inter_700Bold',
      fontSize: fontSize.xxs,
      letterSpacing: 1.2,
      marginBottom: spacing.sm,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    featureIconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.sm,
      flex: 1,
    },

    // ── Plans ─────────────────────────────────────────────────────────────────
    plansBlock: {
      gap: spacing.sm,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      gap: spacing.sm,
      position: 'relative',
      overflow: 'hidden',
    },
    planCardLeft: {
      flex: 1,
    },
    planCardRight: {
      alignItems: 'flex-end',
    },
    planCardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    planName: {
      fontFamily: 'Inter_700Bold',
      fontSize: fontSize.base,
    },
    bestValueBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.xs,
    },
    bestValueText: {
      color: '#fff',
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 9,
      letterSpacing: 0.8,
    },
    planSubtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    planPrice: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: fontSize.xl,
    },
    selectedDot: {
      position: 'absolute',
      top: -1,
      right: -1,
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Preview notice ────────────────────────────────────────────────────────
    previewNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      marginTop: spacing.sm,
    },
    previewText: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.xs,
      flex: 1,
      lineHeight: 16,
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaBtn: {
      height: 56,
      borderRadius: radius.lg,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.xl,
      ...Platform.select({
        ios: {
          shadowColor: '#E63935',
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        },
        android: { elevation: 6 },
      }),
    },
    ctaBtnDisabled: {
      opacity: 0.7,
    },
    ctaBtnText: {
      color: '#FFFFFF',
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: fontSize.lg,
      letterSpacing: 1.5,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    restoreBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    restoreText: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.sm,
      textDecorationLine: 'underline',
    },
    legalText: {
      fontFamily: 'Inter_400Regular',
      fontSize: fontSize.xs,
      textAlign: 'center',
      lineHeight: 16,
      paddingHorizontal: spacing.sm,
    },
  });
}
