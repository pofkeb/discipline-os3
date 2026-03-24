import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

type TaskType = 'routine' | 'one_time';

const TYPE_OPTIONS: { key: TaskType; label: string; icon: string; desc: string }[] = [
  { key: 'routine',  label: 'Routine',   icon: 'repeat-outline',        desc: 'Resets every day' },
  { key: 'one_time', label: 'One-Time',  icon: 'checkmark-circle-outline', desc: 'Complete once' },
];

function todayParts(): { month: string; day: string; year: string } {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day:   String(now.getDate()).padStart(2, '0'),
    year:  String(now.getFullYear()),
  };
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CreateTaskScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('routine');
  const [loading, setLoading] = useState(false);

  // Date state — pre-filled with today, only used when taskType === 'one_time'
  const today = todayParts();
  const [dueMonth, setDueMonth] = useState(today.month);
  const [dueDay,   setDueDay]   = useState(today.day);
  const [dueYear,  setDueYear]  = useState(today.year);

  const dueDateStr  = buildDueDate(dueMonth, dueDay, dueYear);
  const datePreview = formatDueDatePreview(dueMonth, dueDay, dueYear);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    // Validate the date when one-time is selected
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
      router.push('/paywall');
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity testID="close-create-task-btn" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>NEW TASK</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>TASK TITLE</Text>
          <TextInput
            testID="task-title-input"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. Read for 30 minutes"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
          />

          {/* Type selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>TYPE</Text>
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map(opt => {
              const active = taskType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  testID={`task-type-${opt.key}-btn`}
                  style={[
                    styles.typeCard,
                    { backgroundColor: colors.surface, borderColor: active ? colors.accent : colors.border },
                    active && styles.typeCardActive,
                  ]}
                  onPress={() => selectType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={active ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.typeLabel, { color: active ? colors.accent : colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: colors.textTertiary }]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due date — only shown for one-time tasks */}
          {taskType === 'one_time' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>DUE DATE</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputWrap}>
                  <TextInput
                    testID="due-month-input"
                    style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={dueMonth}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 2 && Number(n) <= 12) setDueMonth(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>MM</Text>
                </View>

                <Text style={[styles.dateSep, { color: colors.textTertiary }]}>/</Text>

                <View style={styles.dateInputWrap}>
                  <TextInput
                    testID="due-day-input"
                    style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={dueDay}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 2 && Number(n) <= 31) setDueDay(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="DD"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>DD</Text>
                </View>

                <Text style={[styles.dateSep, { color: colors.textTertiary }]}>/</Text>

                <View style={[styles.dateInputWrap, styles.dateYearWrap]}>
                  <TextInput
                    testID="due-year-input"
                    style={[styles.dateInputYear, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={dueYear}
                    onChangeText={v => {
                      const n = v.replace(/\D/g, '');
                      if (n.length <= 4) setDueYear(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="YYYY"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>YYYY</Text>
                </View>
              </View>

              {/* Date preview pill */}
              {datePreview !== '' && (
                <View style={[styles.datePreview, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
                  <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                  <Text style={[styles.datePreviewText, { color: colors.accent }]}>{datePreview}</Text>
                </View>
              )}
            </>
          )}

          {/* Create button */}
          <TouchableOpacity
            testID="save-task-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>ADD TASK</Text>
            }
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 1 },
  form:        { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  label:       { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  input:       { height: 56, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },

  // Type selector
  typeGrid:        { flexDirection: 'row', gap: spacing.sm },
  typeCard:        { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.xs },
  typeCardActive:  { borderWidth: 2 },
  typeLabel:       { fontFamily: 'Inter_700Bold', fontSize: fontSize.sm },
  typeDesc:        { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  // Date inputs
  dateRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dateInputWrap: { alignItems: 'center' },
  dateYearWrap:  {},
  dateInput:     { width: 60, height: 56, borderRadius: radius.md, borderWidth: 1, textAlign: 'center', fontSize: fontSize.lg, fontFamily: 'BarlowCondensed_700Bold' },
  dateInputYear: { width: 80, height: 56, borderRadius: radius.md, borderWidth: 1, textAlign: 'center', fontSize: fontSize.lg, fontFamily: 'BarlowCondensed_700Bold' },
  dateLabel:     { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 4 },
  dateSep:       { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, paddingTop: 14 },

  // Date preview
  datePreview:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1 },
  datePreviewText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

  // Submit
  button:     { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
});
