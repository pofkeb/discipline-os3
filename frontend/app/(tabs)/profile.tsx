import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isPro, restorePurchases } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    Alert.alert(restored ? 'Restored!' : 'Nothing to Restore', restored ? 'Your Pro subscription has been restored.' : 'No previous purchases found.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>PROFILE</Text>

        {/* User Card */}
        <View testID="user-info-card" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>
          {isPro && (
            <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {loading ? <ActivityIndicator color={colors.accent} /> : stats && (
          <View style={styles.statsGrid}>
            <View testID="streak-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="flame" size={24} color={colors.accent} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.streak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
            </View>
            <View testID="completions-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="checkmark-done" size={24} color={colors.success} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_completions}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completions</Text>
            </View>
            <View testID="goals-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="trophy" size={24} color={colors.accent} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_goals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goals</Text>
            </View>
            <View testID="milestones-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="flag" size={24} color={colors.success} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.completed_milestones}/{stats.total_milestones}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Milestones</Text>
            </View>
          </View>
        )}

        {/* Weekly Chart */}
        {stats?.weekly_data && (
          <View testID="weekly-chart" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>THIS WEEK</Text>
            <View style={styles.barChart}>
              {stats.weekly_data.map((d: any, i: number) => {
                const maxCount = Math.max(...stats.weekly_data.map((x: any) => x.count), 1);
                const height = (d.count / maxCount) * 80;
                const dayLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][new Date(d.date).getDay() === 0 ? 6 : new Date(d.date).getDay() - 1] || d.date.slice(-2);
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(height, 4), backgroundColor: d.count > 0 ? colors.accent : colors.surfaceHighlight }]} />
                    <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Subscription */}
        {!isPro && (
          <TouchableOpacity
            testID="upgrade-pro-btn"
            style={[styles.upgradeCard, { borderColor: colors.accent }]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.8}
          >
            <View style={styles.upgradeContent}>
              <Ionicons name="diamond" size={24} color={colors.accent} />
              <View style={styles.upgradeInfo}>
                <Text style={[styles.upgradeTitle, { color: colors.textPrimary }]}>Upgrade to Pro</Text>
                <Text style={[styles.upgradeSub, { color: colors.textSecondary }]}>Unlimited goals, tasks & more</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity testID="restore-purchases-btn" style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleRestore}>
            <Ionicons name="refresh" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Restore Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="logout-btn" style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>Discipline OS v1.0.0</Text>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1, paddingTop: spacing.md, marginBottom: spacing.lg },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },
  userInfo: { flex: 1, marginLeft: spacing.md },
  userName: { fontFamily: 'Inter_700Bold', fontSize: fontSize.lg },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  proBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: radius.sm },
  proText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: '48%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.xs },
  statNumber: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  chartTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.sm, letterSpacing: 1, marginBottom: spacing.md },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  barCol: { alignItems: 'center', gap: spacing.xs },
  bar: { width: 24, borderRadius: 4, minHeight: 4 },
  barLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 2, marginBottom: spacing.md },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  upgradeInfo: {},
  upgradeTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  upgradeSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: spacing.md },
  actionText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  version: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
