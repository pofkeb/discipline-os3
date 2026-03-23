import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, isGuest, login, register, logout } = useAuth();
  const { isPro, restorePurchases } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    api.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        if (!name.trim()) { Alert.alert('Error', 'Please enter your name'); setAuthLoading(false); return; }
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      setShowAuthForm(false);
      Alert.alert('Success', authMode === 'register' ? 'Account created! Your data will sync to the cloud.' : 'Signed in! Your data is now synced.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'You\'ll switch to local mode. Your cloud data is safe.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    Alert.alert(restored ? 'Restored!' : 'Nothing Found', restored ? 'Your Pro subscription has been restored.' : 'No previous purchases found.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>SETTINGS</Text>

          {/* Account Section */}
          {isGuest ? (
            !showAuthForm ? (
              <TouchableOpacity
                testID="sign-in-card"
                style={[styles.authCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}
                onPress={() => setShowAuthForm(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.authIconWrap, { backgroundColor: colors.accent + '12' }]}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.authCardContent}>
                  <Text style={[styles.authCardTitle, { color: colors.textPrimary }]}>Back up your data</Text>
                  <Text style={[styles.authCardDesc, { color: colors.textSecondary }]}>Create an account to sync across devices and protect your progress</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.accent} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{authMode === 'register' ? 'Create Account' : 'Sign In'}</Text>
                  <TouchableOpacity testID="close-auth-form-btn" onPress={() => setShowAuthForm(false)}>
                    <Ionicons name="close" size={24} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                {authMode === 'register' && (
                  <TextInput
                    testID="settings-name-input"
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                  />
                )}
                <TextInput
                  testID="settings-email-input"
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  testID="settings-password-input"
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  testID="settings-auth-submit-btn"
                  style={[styles.authBtn, { backgroundColor: colors.accent }]}
                  onPress={handleAuth}
                  disabled={authLoading}
                >
                  {authLoading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.authBtnText}>{authMode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity testID="toggle-auth-mode-btn" onPress={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>
                  <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                    {authMode === 'register' ? 'Already have an account? ' : 'Need an account? '}
                    <Text style={{ color: colors.accent }}>
                      {authMode === 'register' ? 'Sign In' : 'Create one'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View testID="user-info-card" style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                <View style={styles.syncBadge}>
                  <Ionicons name="cloud-done" size={14} color={colors.success} />
                  <Text style={[styles.syncText, { color: colors.success }]}>Synced</Text>
                </View>
              </View>
              {isPro && (
                <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              )}
            </View>
          )}

          {/* Stats */}
          {loading ? <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} /> : stats && (
            <View style={styles.statsGrid}>
              <View testID="streak-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flame" size={22} color={colors.accent} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
              </View>
              <View testID="completions-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="checkmark-done" size={22} color={colors.success} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_completions}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
              </View>
              <View testID="goals-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy" size={22} color={colors.accent} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_goals}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goals</Text>
              </View>
              <View testID="milestones-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flag" size={22} color={colors.success} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.completed_milestones}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Milestones</Text>
              </View>
            </View>
          )}

          {/* Weekly Chart */}
          {stats?.weekly_data && (
            <View testID="weekly-chart" style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>THIS WEEK</Text>
              <View style={styles.barChart}>
                {stats.weekly_data.map((d: any, i: number) => {
                  const maxCount = Math.max(...stats.weekly_data.map((x: any) => x.count), 1);
                  const height = (d.count / maxCount) * 80;
                  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  const dayLabel = dayLabels[new Date(d.date + 'T12:00:00').getDay()];
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
                <View>
                  <Text style={[styles.upgradeTitle, { color: colors.textPrimary }]}>Upgrade to Pro</Text>
                  <Text style={[styles.upgradeSub, { color: colors.textSecondary }]}>Unlimited goals, tasks & more</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </TouchableOpacity>
          )}

          {/* Action Items */}
          <View style={styles.actions}>
            <TouchableOpacity testID="restore-purchases-btn" style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleRestore}>
              <Ionicons name="refresh" size={20} color={colors.textPrimary} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Restore Purchases</Text>
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity testID="logout-btn" style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Sign Out</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.version, { color: colors.textTertiary }]}>Discipline OS v1.0.0</Text>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1, paddingTop: spacing.md, marginBottom: spacing.lg },
  authCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 2, marginBottom: spacing.lg, gap: spacing.md },
  authIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  authCardContent: { flex: 1 },
  authCardTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  authCardDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2, lineHeight: 20 },
  formCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, gap: spacing.sm },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  formTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 1 },
  input: { height: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.sm, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  authBtn: { height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xs },
  authBtnText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.base, letterSpacing: 1 },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },
  userInfo: { flex: 1, marginLeft: spacing.md },
  userName: { fontFamily: 'Inter_700Bold', fontSize: fontSize.lg },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  syncText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },
  proBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: radius.sm },
  proText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.xs },
  statNumber: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  chartCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, backgroundColor: 'transparent' },
  chartTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.sm, letterSpacing: 1, marginBottom: spacing.md },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  barCol: { alignItems: 'center', gap: spacing.xs },
  bar: { width: 24, borderRadius: 4, minHeight: 4 },
  barLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 2, marginBottom: spacing.md },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  upgradeTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  upgradeSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: spacing.md },
  actionText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  version: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
