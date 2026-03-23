import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import * as Haptics from 'expo-haptics';

const FEATURES = [
  'Unlimited goals & milestones',
  'Unlimited daily tasks',
  'Unlimited reminders',
  'Advanced stats & analytics',
  'Full history & calendar',
  'Premium motivational quotes',
  'Future widget support',
];

export default function PaywallScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { purchasePackage, isLoading } = useSubscription();
  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await purchasePackage(selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.', [
        { text: 'Continue', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity testID="close-paywall-btn" style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons name="diamond" size={48} color={colors.accent} />
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>DISCIPLINE OS</Text>
          <Text style={[styles.heroSub, { color: colors.accent }]}>PRO</Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>Unlock your full potential</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <TouchableOpacity
            testID="yearly-plan-btn"
            style={[styles.planCard, { borderColor: selected === 'yearly' ? colors.accent : colors.border, backgroundColor: colors.surface }]}
            onPress={() => setSelected('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.planTop}>
              <Text style={[styles.planName, { color: colors.textPrimary }]}>Yearly</Text>
              <View style={[styles.saveBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveText}>SAVE 50%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: colors.textPrimary }]}>$29.99<Text style={[styles.planPer, { color: colors.textSecondary }]}>/year</Text></Text>
            <Text style={[styles.planMonthly, { color: colors.textTertiary }]}>$2.50/month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="monthly-plan-btn"
            style={[styles.planCard, { borderColor: selected === 'monthly' ? colors.accent : colors.border, backgroundColor: colors.surface }]}
            onPress={() => setSelected('monthly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.planName, { color: colors.textPrimary }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: colors.textPrimary }]}>$4.99<Text style={[styles.planPer, { color: colors.textSecondary }]}>/month</Text></Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="purchase-btn"
          style={[styles.purchaseBtn, { backgroundColor: colors.accent }]}
          onPress={handlePurchase}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.purchaseText}>START {selected === 'yearly' ? 'YEARLY' : 'MONTHLY'} PLAN</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textTertiary }]}>
          Cancel anytime. Subscriptions auto-renew.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  closeBtn: { alignSelf: 'flex-end', paddingTop: spacing.md },
  hero: { alignItems: 'center', marginVertical: spacing.lg },
  heroTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.display, letterSpacing: 2, marginTop: spacing.md },
  heroSub: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 3, marginTop: -4 },
  heroDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, marginTop: spacing.sm },
  features: { gap: spacing.sm, marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  plans: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  planCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2 },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  planName: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  saveBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  saveText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: 10, letterSpacing: 0.5 },
  planPrice: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl },
  planPer: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  planMonthly: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 2 },
  purchaseBtn: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  purchaseText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  legal: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
