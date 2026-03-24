import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { incrementPaywallHits } from '../src/config/revenuecat';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../src/services/notifications';
import type { ReminderIntervalType } from '../src/services/notifications';

// RepeatType is an alias for the shared ReminderIntervalType — kept as a local name for clarity
type RepeatType = ReminderIntervalType;

const REPEAT_OPTIONS: { key: RepeatType; label: string; icon: string }[] = [
  { key: 'minutes', label: 'Minutes', icon: 'timer-outline' },
  { key: 'hours',   label: 'Hours',   icon: 'time-outline' },
  { key: 'specific', label: 'Time',   icon: 'alarm-outline' },
];

const QUICK_INTERVALS: Record<string, number[]> = {
  minutes: [15, 30, 45, 60],
  hours: [1, 2, 4, 8],
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
  const c = useThemeColors();
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('hours');
  const [intervalValue, setIntervalValue] = useState('1');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return;
    api.getReminders().then((reminders: any[]) => {
      const rem = reminders.find((r: any) => r.id === editId);
      if (!rem) { Alert.alert('Error', 'Reminder not found'); router.back(); return; }
      setTitle(rem.title);
      setNote(rem.note ?? '');
      setRepeatType(rem.interval_type as RepeatType);
      setIntervalValue(String(rem.interval_value));
      if (rem.interval_type === 'specific' && rem.specific_time) {
        const [h, m] = rem.specific_time.split(':');
        setHour(h); setMinute(m);
      }
    }).finally(() => setInitializing(false));
  }, [editId]);

  const specificTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  const preview = formatNextDue(repeatType, parseInt(intervalValue) || 1, specificTime);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a reminder title'); return; }
    if (!isEditing) {
      const reminders = await api.getReminders();
      const limits = getLimits(plan);
      if (reminders.length >= limits.maxReminders) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const hits = await incrementPaywallHits();
        router.push({ pathname: '/paywall', params: { reason: 'reminder_limit', hits: String(hits) } } as any);
        return;
      }
    }
    const permStatus = await getNotificationPermissionStatus();
    if (permStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications Disabled', isEditing
          ? 'Your reminder was updated but notifications are disabled.'
          : 'Your reminder was saved but notifications are disabled.', [{ text: 'OK' }]);
      }
    }
    setLoading(true);
    try {
      const time = repeatType === 'specific' ? specificTime : undefined;
      if (isEditing) {
        await api.updateReminder(editId!, title.trim(), repeatType, parseInt(intervalValue) || 1, time, note.trim());
      } else {
        await api.createReminder(title.trim(), repeatType, parseInt(intervalValue) || 1, time, note.trim());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || (isEditing ? 'Failed to update reminder' : 'Failed to create reminder'));
    } finally { setLoading(false); }
  };

  const selectQuickInterval = (val: number) => {
    Haptics.selectionAsync();
    setIntervalValue(String(val));
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity testID="close-create-reminder-btn" onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.textPrimary }]}>{isEditing ? 'Edit Reminder' : 'New Reminder'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {initializing ? (
          <View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[s.label, { color: c.textTertiary }]}>TITLE</Text>
            <TextInput
              testID="reminder-title-input"
              style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
              placeholder="e.g. Drink water"
              placeholderTextColor={c.textTertiary}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* Note */}
            <Text style={[s.label, { color: c.textTertiary }]}>NOTE <Text style={{ fontFamily: 'Inter_400Regular' }}>(optional)</Text></Text>
            <TextInput
              testID="reminder-note-input"
              style={[s.noteInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
              placeholder="Add context..."
              placeholderTextColor={c.textTertiary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Repeat type */}
            <Text style={[s.label, { color: c.textTertiary }]}>REPEAT</Text>
            <View style={s.repeatRow}>
              {REPEAT_OPTIONS.map(opt => {
                const active = repeatType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    testID={`repeat-type-${opt.key}-btn`}
                    style={[
                      s.repeatChip,
                      { backgroundColor: active ? c.accent : c.surface, borderColor: active ? c.accent : c.border },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setRepeatType(opt.key); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={opt.icon as any} size={16} color={active ? '#fff' : c.textSecondary} />
                    <Text style={[s.repeatChipText, { color: active ? '#fff' : c.textPrimary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Interval config */}
            {repeatType !== 'specific' ? (
              <>
                <Text style={[s.label, { color: c.textTertiary }]}>EVERY</Text>
                <View style={s.intervalRow}>
                  <TextInput
                    testID="interval-value-input"
                    style={[s.intervalInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                    value={intervalValue}
                    onChangeText={setIntervalValue}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={[s.intervalUnit, { color: c.textSecondary }]}>{repeatType}</Text>
                </View>
                {QUICK_INTERVALS[repeatType] && (
                  <View style={s.quickRow}>
                    {QUICK_INTERVALS[repeatType].map(val => (
                      <TouchableOpacity
                        key={val}
                        testID={`quick-${val}-btn`}
                        style={[
                          s.quickChip,
                          { backgroundColor: intervalValue === String(val) ? c.accent : c.surface, borderColor: intervalValue === String(val) ? c.accent : c.border },
                        ]}
                        onPress={() => selectQuickInterval(val)}
                      >
                        <Text style={[s.quickChipText, { color: intervalValue === String(val) ? '#fff' : c.textSecondary }]}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={[s.label, { color: c.textTertiary }]}>TIME</Text>
                <View style={s.timeRow}>
                  <View style={s.timeCol}>
                    <TextInput
                      testID="time-hour-input"
                      style={[s.timeInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                      value={hour}
                      onChangeText={t => { const n = t.replace(/\D/g, ''); if (n.length <= 2 && Number(n) <= 23) setHour(n); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="09"
                      placeholderTextColor={c.textTertiary}
                    />
                    <Text style={[s.timeHint, { color: c.textTertiary }]}>Hour</Text>
                  </View>
                  <Text style={[s.timeSep, { color: c.textPrimary }]}>:</Text>
                  <View style={s.timeCol}>
                    <TextInput
                      testID="time-minute-input"
                      style={[s.timeInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                      value={minute}
                      onChangeText={t => { const n = t.replace(/\D/g, ''); if (n.length <= 2 && Number(n) <= 59) setMinute(n); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="00"
                      placeholderTextColor={c.textTertiary}
                    />
                    <Text style={[s.timeHint, { color: c.textTertiary }]}>Minute</Text>
                  </View>
                </View>
              </>
            )}

            {/* Preview */}
            {title.trim() !== '' && (
              <View testID="reminder-preview" style={[s.previewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.previewIcon, { backgroundColor: c.accent + '12' }]}>
                  <Ionicons name="notifications" size={16} color={c.accent} />
                </View>
                <View style={s.previewContent}>
                  <Text style={[s.previewTitle, { color: c.textPrimary }]} numberOfLines={1}>{title.trim()}</Text>
                  <Text style={[s.previewSub, { color: c.textTertiary }]}>
                    {repeatType === 'specific' ? `Daily at ${specificTime}` : `Every ${intervalValue} ${repeatType}`}
                    {preview ? ` · ${preview}` : ''}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        )}

        {/* CTA */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            testID="save-reminder-btn"
            style={[s.button, { backgroundColor: title.trim() ? c.accent : c.border }]}
            onPress={handleCreate}
            disabled={loading || !title.trim()}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>{isEditing ? 'UPDATE REMINDER' : 'ADD REMINDER'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  noteInput: {
    height: 72,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },

  // Repeat type chips
  repeatRow: { flexDirection: 'row', gap: spacing.sm },
  repeatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  repeatChipText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

  // Interval
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  intervalInput: {
    width: 72,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  intervalUnit: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  quickChipText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

  // Time inputs
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  timeCol: { alignItems: 'center' },
  timeInput: {
    width: 64,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: fontSize.xxl,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  timeHint: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xxs, marginTop: 4 },
  timeSep: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, paddingTop: 12 },

  // Preview
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: { flex: 1 },
  previewTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  previewSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 2 },

  // CTA
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  button: {
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.base,
    letterSpacing: 1.5,
  },
});
