import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

const INTERVAL_TYPES = [
  { key: 'minutes', label: 'Minutes' },
  { key: 'hours', label: 'Hours' },
  { key: 'daily', label: 'Daily' },
];

export default function CreateReminderScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [intervalType, setIntervalType] = useState('hours');
  const [intervalValue, setIntervalValue] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a reminder title');
      return;
    }
    const reminders = await api.getReminders();
    const limits = getLimits(plan);
    if (reminders.length >= limits.maxReminders) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    setLoading(true);
    try {
      await api.createReminder(title.trim(), intervalType, parseInt(intervalValue) || 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity testID="close-create-reminder-btn" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>NEW REMINDER</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>REMINDER TITLE</Text>
          <TextInput
            testID="reminder-title-input"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. Drink water"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>INTERVAL TYPE</Text>
          <View style={styles.intervalRow}>
            {INTERVAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                testID={`interval-type-${t.key}-btn`}
                style={[styles.intervalBtn, { borderColor: colors.border }, intervalType === t.key && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => setIntervalType(t.key)}
              >
                <Text style={[styles.intervalText, { color: intervalType === t.key ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {intervalType !== 'daily' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>EVERY</Text>
              <TextInput
                testID="interval-value-input"
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                value={intervalValue}
                onChangeText={setIntervalValue}
                keyboardType="number-pad"
              />
            </>
          )}

          <TouchableOpacity
            testID="save-reminder-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ADD REMINDER</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 1 },
  form: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  label: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginTop: spacing.sm },
  input: { height: 56, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  intervalRow: { flexDirection: 'row', gap: spacing.sm },
  intervalBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  intervalText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  button: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
});
