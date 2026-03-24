import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { incrementPaywallHits } from '../src/config/revenuecat';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

type TaskType = 'non_negotiable' | 'negotiable' | 'one_time';

const TYPE_OPTIONS: { key: TaskType; label: string; icon: string; desc: string }[] = [
  { key: 'non_negotiable', label: 'Non-Negotiable', icon: 'shield-checkmark-outline', desc: 'Builds your daily streak' },
  { key: 'negotiable',     label: 'Negotiable',     icon: 'repeat-outline',           desc: 'Optional — no streak impact' },
  { key: 'one_time',       label: 'One-Time',       icon: 'checkmark-circle-outline', desc: 'Complete once, with a due date' },
];

function todayParts(): { month: string; day: string; year: string } {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day:   String(now.getDate()).padStart(2, '0'),
    year:  String(now.getFullYear()),
  };
}

function dateParts(dateStr: string): { month: string; day: string; year: string } {
  const [year, month, day] = dateStr.split('-');
  return { month, day, year };
}

function buildDueDate(month: string, day: string, year: string): string {
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDueDatePreview(month: string, day: string, year: string): string {
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  if (isNaN(date.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${year}-${month}-${day}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CreateTaskScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  
  const params = useLocalSearchParams<{ prefillDate?: string; prefillType?: string }>();
  const prefillDate = params.prefillDate;
  const prefillType = params.prefillType as TaskType | undefined;
  
  const initialDate = prefillDate ? dateParts(prefillDate) : todayParts();
  const initialType: TaskType = prefillType || 'non_negotiable';
  
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>(initialType);
  const [loading, setLoading] = useState(false);
  const [dueMonth, setDueMonth] = useState(initialDate.month);
  const [dueDay,   setDueDay]   = useState(initialDate.day);
  const [dueYear,  setDueYear]  = useState(initialDate.year);

  const dueDateStr  = buildDueDate(dueMonth, dueDay, dueYear);
  const datePreview = formatDueDatePreview(dueMonth, dueDay, dueYear);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    if (taskType === 'one_time') {
      const parsed = new Date(`${dueDateStr}T12:00:00`);
      if (isNaN(parsed.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date');
        return;
      }
    }
    const tasks = await api.getTasks();
    const limits = getLimits(plan);
    if (tasks.length >= limits.maxTasks) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const hits = await incrementPaywallHits();
      router.push({ pathname: '/paywall', params: { reason: 'task_limit', hits: String(hits) } } as any);
      return;
    }
    setLoading(true);
    try {
      const due = taskType === 'one_time' ? dueDateStr : null;
      await api.createTask(title.trim(), taskType, due);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const selectType = (t: TaskType) => {
    Haptics.selectionAsync();
    setTaskType(t);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity testID="close-create-task-btn" onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.textPrimary }]}>New Task</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[s.label, { color: c.textTertiary }]}>TITLE</Text>
          <TextInput
            testID="task-title-input"
            style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
            placeholder="What do you need to do?"
            placeholderTextColor={c.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
          />

          {/* Type selector */}
          <Text style={[s.label, { color: c.textTertiary }]}>TYPE</Text>
          <View style={[s.typeGroup, { backgroundColor: c.surface, borderColor: c.border }]}>
            {TYPE_OPTIONS.map((opt, i) => {
              const active = taskType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  testID={`task-type-${opt.key}-btn`}
                  style={[
                    s.typeRow,
                    i < TYPE_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
                  ]}
                  onPress={() => selectType(opt.key)}
                  activeOpacity={0.6}
                >
                  <View style={[s.typeIcon, { backgroundColor: active ? c.accent + '12' : c.surfaceHighlight }]}>
                    <Ionicons name={opt.icon as any} size={18} color={active ? c.accent : c.textTertiary} />
                  </View>
                  <View style={s.typeContent}>
                    <Text style={[s.typeLabel, { color: active ? c.accent : c.textPrimary }]}>{opt.label}</Text>
                    <Text style={[s.typeDesc, { color: c.textTertiary }]}>{opt.desc}</Text>
                  </View>
                  <View style={[s.radio, { borderColor: active ? c.accent : c.textTertiary }]}>
                    {active && <View style={[s.radioInner, { backgroundColor: c.accent }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due date for one-time */}
          {taskType === 'one_time' && (
            <>
              <Text style={[s.label, { color: c.textTertiary }]}>DUE DATE</Text>
              <View style={s.dateRow}>
                <View style={s.dateCol}>
                  <TextInput
                    testID="due-month-input"
                    style={[s.dateInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                    value={dueMonth}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 2 && Number(n) <= 12) setDueMonth(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={c.textTertiary}
                  />
                  <Text style={[s.dateHint, { color: c.textTertiary }]}>Month</Text>
                </View>
                <Text style={[s.dateSep, { color: c.textTertiary }]}>/</Text>
                <View style={s.dateCol}>
                  <TextInput
                    testID="due-day-input"
                    style={[s.dateInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                    value={dueDay}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 2 && Number(n) <= 31) setDueDay(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="DD"
                    placeholderTextColor={c.textTertiary}
                  />
                  <Text style={[s.dateHint, { color: c.textTertiary }]}>Day</Text>
                </View>
                <Text style={[s.dateSep, { color: c.textTertiary }]}>/</Text>
                <View style={s.dateCol}>
                  <TextInput
                    testID="due-year-input"
                    style={[s.dateInputYear, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                    value={dueYear}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 4) setDueYear(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="YYYY"
                    placeholderTextColor={c.textTertiary}
                  />
                  <Text style={[s.dateHint, { color: c.textTertiary }]}>Year</Text>
                </View>
              </View>
              {datePreview !== '' && (
                <View style={[s.datePill, { backgroundColor: c.accent + '10' }]}>
                  <Ionicons name="calendar-outline" size={14} color={c.accent} />
                  <Text style={[s.datePillText, { color: c.accent }]}>{datePreview}</Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            testID="save-task-btn"
            style={[s.button, { backgroundColor: title.trim() ? c.accent : c.border }]}
            onPress={handleCreate}
            disabled={loading || !title.trim()}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>ADD TASK</Text>
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

  // Type selector
  typeGroup: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeContent: { flex: 1 },
  typeLabel: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  typeDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xxs, marginTop: 1 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  // Date inputs
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dateCol: { alignItems: 'center' },
  dateInput: {
    width: 56,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  dateInputYear: {
    width: 72,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  dateHint: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xxs, marginTop: 4 },
  dateSep: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, paddingTop: 12 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  datePillText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

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
