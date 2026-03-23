import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

type RepeatType = 'minutes' | 'hours' | 'specific';

const REPEAT_OPTIONS: { key: RepeatType; label: string; icon: string; desc: string }[] = [
  { key: 'minutes', label: 'Minutes', icon: 'timer-outline', desc: 'Repeat every X minutes' },
  { key: 'hours', label: 'Hours', icon: 'time-outline', desc: 'Repeat every X hours' },
  { key: 'specific', label: 'Time', icon: 'alarm-outline', desc: 'Daily at a specific time' },
];

const QUICK_INTERVALS: Record<string, { label: string; value: number }[]> = {
  minutes: [
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '45', value: 45 },
    { label: '60', value: 60 },
  ],
  hours: [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
    { label: '8', value: 8 },
  ],
};

function formatNextDue(type: RepeatType, value: number, specificTime?: string): string {
  const now = new Date();
  if (type === 'specific' && specificTime) {
    const [h, m] = specificTime.split(':').map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const diff = next.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `In ${hours}h ${mins}m`;
    return `In ${mins}m`;
  }
  if (type === 'minutes') return `In ${value} min`;
  if (type === 'hours') return `In ${value}h`;
  return '';
}

export default function CreateReminderScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('hours');
  const [intervalValue, setIntervalValue] = useState('1');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [loading, setLoading] = useState(false);

  const specificTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  const preview = formatNextDue(repeatType, parseInt(intervalValue) || 1, specificTime);

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
      const time = repeatType === 'specific' ? specificTime : undefined;
      await api.createReminder(title.trim(), repeatType, parseInt(intervalValue) || 1, time, note.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const selectQuickInterval = (val: number) => {
    Haptics.selectionAsync();
    setIntervalValue(String(val));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="close-create-reminder-btn" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>NEW REMINDER</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE</Text>
          <TextInput
            testID="reminder-title-input"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. Drink water, Stand up, Deep breaths"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          {/* Note */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>NOTE (OPTIONAL)</Text>
          <TextInput
            testID="reminder-note-input"
            style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Add context or instructions..."
            placeholderTextColor={colors.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Repeat Type */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>REPEAT</Text>
          <View style={styles.repeatGrid}>
            {REPEAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                testID={`repeat-type-${opt.key}-btn`}
                style={[
                  styles.repeatCard,
                  { backgroundColor: colors.surface, borderColor: repeatType === opt.key ? colors.accent : colors.border },
                  repeatType === opt.key && { borderWidth: 2 },
                ]}
                onPress={() => { Haptics.selectionAsync(); setRepeatType(opt.key); }}
                activeOpacity={0.7}
              >
                <Ionicons name={opt.icon as any} size={22} color={repeatType === opt.key ? colors.accent : colors.textSecondary} />
                <Text style={[styles.repeatLabel, { color: repeatType === opt.key ? colors.accent : colors.textPrimary }]}>{opt.label}</Text>
                <Text style={[styles.repeatDesc, { color: colors.textTertiary }]}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interval Config */}
          {repeatType !== 'specific' ? (
            <View style={styles.intervalSection}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>EVERY</Text>
              <View style={styles.intervalRow}>
                <TextInput
                  testID="interval-value-input"
                  style={[styles.intervalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={intervalValue}
                  onChangeText={setIntervalValue}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={[styles.intervalUnit, { color: colors.textSecondary }]}>{repeatType}</Text>
              </View>
              {QUICK_INTERVALS[repeatType] && (
                <View style={styles.quickRow}>
                  {QUICK_INTERVALS[repeatType].map(q => (
                    <TouchableOpacity
                      key={q.value}
                      testID={`quick-${q.value}-btn`}
                      style={[
                        styles.quickChip,
                        { borderColor: colors.border },
                        intervalValue === String(q.value) && { backgroundColor: colors.accent, borderColor: colors.accent },
                      ]}
                      onPress={() => selectQuickInterval(q.value)}
                    >
                      <Text style={[styles.quickChipText, { color: intervalValue === String(q.value) ? '#fff' : colors.textSecondary }]}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.intervalSection}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>TIME</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeInputWrap}>
                  <TextInput
                    testID="time-hour-input"
                    style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={hour}
                    onChangeText={t => { const n = t.replace(/\D/g, ''); if (n.length <= 2 && Number(n) <= 23) setHour(n); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="09"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>HH</Text>
                </View>
                <Text style={[styles.timeSep, { color: colors.textPrimary }]}>:</Text>
                <View style={styles.timeInputWrap}>
                  <TextInput
                    testID="time-minute-input"
                    style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={minute}
                    onChangeText={t => { const n = t.replace(/\D/g, ''); if (n.length <= 2 && Number(n) <= 59) setMinute(n); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>MM</Text>
                </View>
              </View>
            </View>
          )}

          {/* Preview */}
          {title.trim() !== '' && (
            <View testID="reminder-preview" style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="notifications" size={18} color={colors.accent} />
              <View style={styles.previewContent}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{title.trim()}</Text>
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                  {repeatType === 'specific'
                    ? `Daily at ${specificTime}`
                    : `Every ${intervalValue} ${repeatType}`}
                  {preview ? `  ·  ${preview}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            testID="save-reminder-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ADD REMINDER</Text>}
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  label: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { height: 56, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  noteInput: { height: 80, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  repeatGrid: { flexDirection: 'row', gap: spacing.sm },
  repeatCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.xs },
  repeatLabel: { fontFamily: 'Inter_700Bold', fontSize: fontSize.sm },
  repeatDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },
  intervalSection: { marginTop: spacing.sm },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  intervalInput: { width: 80, height: 56, borderRadius: radius.md, borderWidth: 1, textAlign: 'center', fontSize: fontSize.xxl, fontFamily: 'BarlowCondensed_700Bold' },
  intervalUnit: { fontFamily: 'Inter_500Medium', fontSize: fontSize.lg },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  quickChipText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeInputWrap: { alignItems: 'center' },
  timeInput: { width: 72, height: 64, borderRadius: radius.md, borderWidth: 1, textAlign: 'center', fontSize: fontSize.xxxl, fontFamily: 'BarlowCondensed_700Bold' },
  timeLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 4 },
  timeSep: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, marginBottom: spacing.lg },
  previewCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.lg, gap: spacing.md },
  previewContent: { flex: 1 },
  previewTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  previewSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 2 },
  button: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
});
