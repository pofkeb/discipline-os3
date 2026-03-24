import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';
import { getNotificationPermissionStatus, requestNotificationPermission, syncAllReminderNotifications } from '../../src/services/notifications';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, isGuest, login, register, logout } = useAuth();
  const { isPro, restorePurchases } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    api.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
    getNotificationPermissionStatus().then(setNotificationStatus);
  }, []));

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your name'); setAuthLoading(false); return; }
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAuthForm(false);
      setName(''); setEmail(''); setPassword('');
      Alert.alert(
        authMode === 'register' ? 'Account Created' : 'Signed In',
        authMode === 'register' ? 'Your data will now sync to the cloud.' : 'Your data is now synced.'
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Sign Out', 'You will switch to local mode. Your cloud data stays safe.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logout();
      }},
    ]);
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const restored = await restorePurchases();
    Haptics.notificationAsync(restored ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      restored ? 'Restored' : 'Nothing Found',
      restored ? 'Your Pro subscription has been restored.' : 'No previous purchases found.'
    );
  };

  const handleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (notificationStatus === 'granted') {
      // Already granted - offer to open settings or sync
      Alert.alert(
        'Notifications Enabled',
        'Notifications are already enabled. Would you like to sync your reminders?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sync Now', 
            onPress: async () => {
              const reminders = await api.getReminders();
              await syncAllReminderNotifications(reminders);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Synced', 'Your reminder notifications have been updated.');
            }
          },
        ]
      );
    } else if (notificationStatus === 'denied') {
      // Previously denied - guide to settings
      Alert.alert(
        'Notifications Disabled',
        'To receive reminder alerts, please enable notifications in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings()
          },
        ]
      );
    } else {
      // Undetermined - request permission
      const granted = await requestNotificationPermission();
      setNotificationStatus(granted ? 'granted' : 'denied');
      
      if (granted) {
        // Sync existing reminders
        const reminders = await api.getReminders();
        await syncAllReminderNotifications(reminders);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Enabled', 'Notifications enabled! Your reminders will now alert you.');
      } else {
        Alert.alert('Not Enabled', 'You can enable notifications later from Settings.');
      }
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{title}</Text>
  );

  const SettingRow = ({ 
    icon, 
    label, 
    sublabel,
    onPress, 
    rightElement,
    destructive = false,
    testID,
  }: { 
    icon: string; 
    label: string; 
    sublabel?: string;
    onPress?: () => void; 
    rightElement?: React.ReactNode;
    destructive?: boolean;
    testID?: string;
  }) => (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: pressed && onPress ? colors.surfaceHighlight : colors.surface },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: destructive ? colors.error + '15' : colors.accent + '12' }]}>
        <Ionicons name={icon as any} size={18} color={destructive ? colors.error : colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: destructive ? colors.error : colors.textPrimary }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSublabel, { color: colors.textTertiary }]}>{sublabel}</Text>
        )}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />)}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          </View>

          {/* Account Section */}
          <SectionHeader title="ACCOUNT" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isGuest ? (
              !showAuthForm ? (
                <Pressable
                  testID="sign-in-card"
                  style={({ pressed }) => [
                    styles.accountPrompt,
                    { backgroundColor: pressed ? colors.surfaceHighlight : 'transparent' },
                  ]}
                  onPress={() => setShowAuthForm(true)}
                >
                  <View style={[styles.accountIconWrap, { backgroundColor: colors.accent + '12' }]}>
                    <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.accountPromptContent}>
                    <Text style={[styles.accountPromptTitle, { color: colors.textPrimary }]}>Sync to cloud</Text>
                    <Text style={[styles.accountPromptDesc, { color: colors.textSecondary }]}>
                      Back up and sync your data across devices
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ) : (
                <View style={styles.authForm}>
                  <View style={styles.authFormHeader}>
                    <Text style={[styles.authFormTitle, { color: colors.textPrimary }]}>
                      {authMode === 'register' ? 'Create Account' : 'Sign In'}
                    </Text>
                    <TouchableOpacity testID="close-auth-form-btn" onPress={() => setShowAuthForm(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color={colors.textTertiary} />
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
                      autoCapitalize="words"
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
                    autoCorrect={false}
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
                    activeOpacity={0.8}
                  >
                    {authLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.authBtnText}>{authMode === 'register' ? 'Create Account' : 'Sign In'}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID="toggle-auth-mode-btn" 
                    onPress={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                    style={styles.authSwitch}
                  >
                    <Text style={[styles.authSwitchText, { color: colors.textSecondary }]}>
                      {authMode === 'register' ? 'Already have an account? ' : 'Need an account? '}
                      <Text style={{ color: colors.accent, fontFamily: 'Inter_500Medium' }}>
                        {authMode === 'register' ? 'Sign In' : 'Create one'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View testID="user-info-card" style={styles.userCard}>
                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name}</Text>
                    {isPro && (
                      <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.proText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                  <View style={styles.syncBadge}>
                    <Ionicons name="cloud-done" size={12} color={colors.success} />
                    <Text style={[styles.syncText, { color: colors.success }]}>Synced to cloud</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Stats Section */}
          <SectionHeader title="YOUR PROGRESS" />
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
          ) : stats && (
            <View style={styles.statsGrid}>
              <View testID="streak-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flame" size={20} color={colors.accent} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Day Streak</Text>
              </View>
              <View testID="completions-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="checkmark-done" size={20} color={colors.success} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_completions}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Completed</Text>
              </View>
              <View testID="goals-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy" size={20} color={colors.accent} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total_goals}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Goals</Text>
              </View>
              <View testID="milestones-stat" style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flag" size={20} color={colors.success} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.completed_milestones}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Milestones</Text>
              </View>
            </View>
          )}

          {/* Weekly Activity */}
          {stats?.weekly_data && (
            <View testID="weekly-chart" style={[styles.card, styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>This Week</Text>
              <View style={styles.barChart}>
                {stats.weekly_data.map((d: any, i: number) => {
                  const maxCount = Math.max(...stats.weekly_data.map((x: any) => x.count), 1);
                  const height = (d.count / maxCount) * 60;
                  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  const dayLabel = dayLabels[new Date(d.date + 'T12:00:00').getDay()];
                  const isToday = new Date(d.date + 'T12:00:00').toDateString() === new Date().toDateString();
                  return (
                    <View key={i} style={styles.barCol}>
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: Math.max(height, 4), 
                            backgroundColor: d.count > 0 ? colors.accent : colors.surfaceHighlight,
                          }
                        ]} 
                      />
                      <Text style={[
                        styles.barLabel, 
                        { color: isToday ? colors.accent : colors.textTertiary },
                        isToday && { fontFamily: 'Inter_600SemiBold' }
                      ]}>
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Subscription Section */}
          {!isPro && (
            <>
              <SectionHeader title="SUBSCRIPTION" />
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  testID="upgrade-pro-btn"
                  style={({ pressed }) => [
                    styles.upgradeRow,
                    { backgroundColor: pressed ? colors.surfaceHighlight : 'transparent' },
                  ]}
                  onPress={() => router.push('/paywall')}
                >
                  <View style={[styles.settingIconWrap, { backgroundColor: colors.accent + '12' }]}>
                    <Ionicons name="diamond" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Upgrade to Pro</Text>
                    <Text style={[styles.settingSublabel, { color: colors.textTertiary }]}>Unlimited goals, tasks & more</Text>
                  </View>
                  <View style={[styles.upgradeArrow, { backgroundColor: colors.accent }]}>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </View>
                </Pressable>
              </View>
            </>
          )}

          {/* Actions Section */}
          <SectionHeader title="GENERAL" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              testID="notifications-btn"
              icon="notifications-outline"
              label="Notifications"
              sublabel={
                notificationStatus === 'granted' 
                  ? 'Enabled' 
                  : notificationStatus === 'denied' 
                    ? 'Disabled - Tap to enable'
                    : 'Tap to enable'
              }
              onPress={handleNotifications}
              rightElement={
                <View style={[
                  styles.statusDot,
                  { backgroundColor: notificationStatus === 'granted' ? colors.success : colors.textTertiary }
                ]} />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              testID="restore-purchases-btn"
              icon="refresh"
              label="Restore Purchases"
              sublabel="Recover previous subscriptions"
              onPress={handleRestore}
            />
            {!isGuest && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <SettingRow
                  testID="logout-btn"
                  icon="log-out-outline"
                  label="Sign Out"
                  sublabel="Switch to local mode"
                  onPress={handleLogout}
                  destructive
                />
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.version, { color: colors.textTertiary }]}>Discipline OS v1.0.0</Text>
            <Text style={[styles.footerNote, { color: colors.textTertiary }]}>Your data is stored locally first</Text>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xxl,
    letterSpacing: 1,
  },
  sectionHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountPromptContent: {
    flex: 1,
  },
  accountPromptTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.base,
  },
  accountPromptDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  authForm: {
    padding: spacing.md,
  },
  authFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  authFormTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.lg,
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  authBtn: {
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  authBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.sm,
  },
  authSwitch: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  authSwitchText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xl,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.base,
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  syncText: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
  },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  proText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xl,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
  },
  chartCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  chartTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
  },
  barCol: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  bar: {
    width: 28,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.base,
  },
  settingSublabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  upgradeArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  version: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
  },
  footerNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
