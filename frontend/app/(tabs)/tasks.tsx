import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Task = { id: string; title: string; is_completed_today: boolean };
type Reminder = { id: string; title: string; note?: string; interval_type: string; interval_value: number; specific_time?: string; is_active: boolean };

export default function TasksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders'>('tasks');

  const loadData = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([api.getTasks(), api.getReminders()]);
      setTasks(t);
      setReminders(r);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleTask = async (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await api.toggleTask(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: res.is_completed } : t));
  };

  const deleteTask = (id: string) => {
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      }},
    ]);
  };

  const deleteReminder = (id: string) => {
    Alert.alert('Delete Reminder', 'Remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteReminder(id);
        setReminders(prev => prev.filter(r => r.id !== id));
      }},
    ]);
  };

  const toggleReminderActive = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await api.toggleReminderActive(id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active: res.is_active } : r));
  };

  const getNextDue = (item: Reminder): string => {
    if (!item.is_active) return 'Paused';
    const now = new Date();
    if (item.interval_type === 'specific' && item.specific_time) {
      const [h, m] = item.specific_time.split(':').map(Number);
      const next = new Date(now);
      next.setHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const diff = next.getTime() - now.getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hrs > 0) return `Next in ${hrs}h ${mins}m`;
      return `Next in ${mins}m`;
    }
    if (item.interval_type === 'minutes') return `Next in ${item.interval_value}m`;
    if (item.interval_type === 'hours') return `Next in ${item.interval_value}h`;
    return '';
  };

  const getRepeatLabel = (item: Reminder): string => {
    if (item.interval_type === 'specific' && item.specific_time) return `Daily at ${item.specific_time}`;
    return `Every ${item.interval_value} ${item.interval_type}`;
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      testID={`task-row-${item.id}`}
      style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleTask(item.id)}
      onLongPress={() => deleteTask(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.is_completed_today && { backgroundColor: colors.accent, borderColor: colors.accent }, !item.is_completed_today && { borderColor: colors.textTertiary }]}>
        {item.is_completed_today && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[styles.taskText, { color: item.is_completed_today ? colors.textTertiary : colors.textPrimary }, item.is_completed_today && styles.taskDone]}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderReminder = ({ item }: { item: Reminder }) => {
    const nextDue = getNextDue(item);
    const repeatLabel = getRepeatLabel(item);
    const iconName = item.interval_type === 'specific' ? 'alarm' : item.interval_type === 'minutes' ? 'timer' : 'time';

    return (
      <View
        testID={`reminder-row-${item.id}`}
        style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border }, !item.is_active && { opacity: 0.55 }]}
      >
        <View style={styles.reminderTop}>
          <View style={[styles.reminderIconBg, { backgroundColor: item.is_active ? colors.accent + '15' : colors.surfaceHighlight }]}>
            <Ionicons name={iconName as any} size={20} color={item.is_active ? colors.accent : colors.textTertiary} />
          </View>
          <View style={styles.reminderBody}>
            <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            {item.note ? <Text style={[styles.reminderNote, { color: colors.textSecondary }]} numberOfLines={1}>{item.note}</Text> : null}
          </View>
          <Switch
            testID={`reminder-toggle-${item.id}`}
            value={item.is_active}
            onValueChange={() => toggleReminderActive(item.id)}
            trackColor={{ false: colors.surfaceHighlight, true: colors.accent + '55' }}
            thumbColor={item.is_active ? colors.accent : colors.textTertiary}
          />
        </View>
        <View style={styles.reminderBottom}>
          <View style={styles.reminderMeta}>
            <Ionicons name="repeat" size={13} color={colors.textTertiary} />
            <Text style={[styles.reminderMetaText, { color: colors.textTertiary }]}>{repeatLabel}</Text>
          </View>
          {nextDue ? (
            <View style={styles.reminderMeta}>
              <Ionicons name="time-outline" size={13} color={item.is_active ? colors.accent : colors.textTertiary} />
              <Text style={[styles.reminderMetaText, { color: item.is_active ? colors.accent : colors.textTertiary }]}>{nextDue}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          testID={`reminder-delete-${item.id}`}
          style={styles.reminderDeleteBtn}
          onPress={() => deleteReminder(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyTasks = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '12' }]}>
        <Ionicons name="checkbox" size={36} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Add your first task</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Build habits one task at a time. Check them off daily to build your streak.</Text>
      <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/create-task')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyBtnText}>ADD TASK</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyReminders = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '12' }]}>
        <Ionicons name="notifications" size={36} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Set up reminders</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Stay on track with recurring prompts that keep you moving forward.</Text>
      <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/create-reminder')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyBtnText}>ADD REMINDER</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {activeTab === 'tasks' ? 'TASKS' : 'REMINDERS'}
        </Text>
        <TouchableOpacity testID="add-item-btn" onPress={() => router.push(activeTab === 'tasks' ? '/create-task' : '/create-reminder')}>
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          testID="tasks-tab-btn"
          style={[styles.tab, activeTab === 'tasks' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tasks' ? '#fff' : colors.textSecondary }]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="reminders-tab-btn"
          style={[styles.tab, activeTab === 'reminders' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('reminders')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'reminders' ? '#fff' : colors.textSecondary }]}>Reminders</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : activeTab === 'tasks' ? (
        tasks.length === 0 ? renderEmptyTasks() : (
          <FlatList data={tasks} keyExtractor={i => i.id} renderItem={renderTask} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
        )
      ) : (
        reminders.length === 0 ? renderEmptyReminders() : (
          <FlatList data={reminders} keyExtractor={i => i.id} renderItem={renderReminder} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1 },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 0.5, marginBottom: spacing.sm },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.base, letterSpacing: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  taskText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, flex: 1 },
  taskDone: { textDecorationLine: 'line-through' },
  reminderCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm, position: 'relative' as const },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  reminderBody: { flex: 1 },
  reminderTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  reminderNote: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  reminderBottom: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, paddingLeft: 52 },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderMetaText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  reminderDeleteBtn: { position: 'absolute' as const, bottom: spacing.md, right: spacing.md },
});
