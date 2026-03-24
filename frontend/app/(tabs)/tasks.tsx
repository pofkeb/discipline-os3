import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, ActivityIndicator, Alert, Switch, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Task = {
  id: string;
  title: string;
  type: 'routine' | 'one_time';
  due_date: string | null;
  is_completed_today: boolean;   // routines: was it done today?
  is_completed: boolean;          // one-time: permanently done?
  completed_date: string | null;  // one-time: date it was marked done
  created_at: string;
};
type Reminder = { id: string; title: string; note?: string; interval_type: string; interval_value: number; specific_time?: string; is_active: boolean };

export default function TasksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders'>('tasks');
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([api.getTasks(), api.getReminders()]);
      setTasks(t);
      setReminders(r);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const switchTab = (tab: 'tasks' | 'reminders') => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'tasks' ? 0 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const toggleTask = async (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await api.toggleTask(taskId);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if ((t.type ?? 'routine') === 'one_time') {
        return { ...t, is_completed: res.is_completed ?? false, completed_date: res.completed_date ?? null };
      }
      return { ...t, is_completed_today: res.is_completed_today ?? false };
    }));
  };

  const deleteTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      }},
    ]);
  };

  const deleteReminder = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      if (hrs > 0) return `in ${hrs}h ${mins}m`;
      return `in ${mins}m`;
    }
    if (item.interval_type === 'minutes') return `in ${item.interval_value}m`;
    if (item.interval_type === 'hours') return `in ${item.interval_value}h`;
    return '';
  };

  const getRepeatLabel = (item: Reminder): string => {
    if (item.interval_type === 'specific' && item.specific_time) return `Daily at ${item.specific_time}`;
    return `Every ${item.interval_value} ${item.interval_type}`;
  };

  // ─── Date helpers ───

  const todayStr = (): string => new Date().toISOString().split('T')[0];

  const isOverdue = (due_date: string | null): boolean => {
    if (!due_date) return false;
    return due_date < todayStr();
  };

  const formatDueLabel = (due_date: string | null): string => {
    if (!due_date) return '';
    const today = todayStr();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split('T')[0];
    if (due_date === today) return 'Today';
    if (due_date === tomorrow) return 'Tomorrow';
    const parsed = new Date(due_date + 'T12:00:00');
    if (isNaN(parsed.getTime())) return due_date;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCompletedDate = (completed_date: string | null): string => {
    if (!completed_date) return 'Done';
    const today = todayStr();
    if (completed_date === today) return 'Done today';
    const parsed = new Date(completed_date + 'T12:00:00');
    if (isNaN(parsed.getTime())) return 'Done';
    return `Done ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // ─── Derived list splits ───
  const routines  = tasks.filter(t => (t.type ?? 'routine') === 'routine');
  const oneTimes  = tasks.filter(t => (t.type ?? 'routine') === 'one_time');
  const doneToday = routines.filter(t => t.is_completed_today).length;
  const totalTasks = tasks.length;
  const activeReminders = reminders.filter(r => r.is_active).length;

  // ─── Render: routine task item ───
  const renderRoutine = (item: Task) => (
    <Pressable
      key={item.id}
      testID={`task-row-${item.id}`}
      style={({ pressed }) => [
        styles.taskItem,
        {
          backgroundColor: pressed ? colors.surfaceHighlight : colors.surface,
          borderColor: item.is_completed_today ? colors.success + '40' : colors.border,
        },
        item.is_completed_today && { borderLeftWidth: 3, borderLeftColor: colors.success },
      ]}
      onPress={() => toggleTask(item.id)}
      onLongPress={() => deleteTask(item.id)}
    >
      <View style={[
        styles.checkbox,
        item.is_completed_today
          ? { backgroundColor: colors.success, borderColor: colors.success }
          : { borderColor: colors.textTertiary, backgroundColor: 'transparent' },
      ]}>
        {item.is_completed_today && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskText,
            { color: item.is_completed_today ? colors.textTertiary : colors.textPrimary },
            item.is_completed_today && styles.taskDone,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.is_completed_today && (
          <Text style={[styles.taskDoneLabel, { color: colors.success }]}>Done today ✓</Text>
        )}
      </View>
    </Pressable>
  );

  // ─── Render: one-time task item ───
  const renderOneTime = (item: Task) => {
    const overdue   = !item.is_completed && isOverdue(item.due_date);
    const dueLabel  = formatDueLabel(item.due_date);
    const doneLabel = formatCompletedDate(item.completed_date);

    // Due badge color
    let dueBgColor = colors.surfaceHighlight;
    let dueTextColor = colors.textTertiary;
    if (item.is_completed) {
      dueBgColor = colors.success + '18';
      dueTextColor = colors.success;
    } else if (overdue) {
      dueBgColor = colors.error + '18';
      dueTextColor = colors.error;
    } else if (item.due_date === todayStr()) {
      dueBgColor = colors.accent + '18';
      dueTextColor = colors.accent;
    }

    return (
      <Pressable
        key={item.id}
        testID={`task-row-${item.id}`}
        style={({ pressed }) => [
          styles.taskItem,
          {
            backgroundColor: pressed ? colors.surfaceHighlight : colors.surface,
            borderColor: item.is_completed
              ? colors.success + '40'
              : overdue
                ? colors.error + '40'
                : colors.border,
          },
          item.is_completed && { borderLeftWidth: 3, borderLeftColor: colors.success },
          overdue && !item.is_completed && { borderLeftWidth: 3, borderLeftColor: colors.error },
        ]}
        onPress={() => toggleTask(item.id)}
        onLongPress={() => deleteTask(item.id)}
      >
        <View style={[
          styles.checkbox,
          styles.checkboxSquare,
          item.is_completed
            ? { backgroundColor: colors.success, borderColor: colors.success }
            : overdue
              ? { borderColor: colors.error, backgroundColor: 'transparent' }
              : { borderColor: colors.textTertiary, backgroundColor: 'transparent' },
        ]}>
          {item.is_completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskText,
              { color: item.is_completed ? colors.textTertiary : overdue ? colors.error : colors.textPrimary },
              item.is_completed && styles.taskDone,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.oneTimeMeta}>
            {item.is_completed ? (
              <Text style={[styles.taskDoneLabel, { color: colors.success }]}>{doneLabel}</Text>
            ) : (
              item.due_date && (
                <View style={[styles.duePill, { backgroundColor: dueBgColor }]}>
                  <Ionicons
                    name={overdue ? 'alert-circle-outline' : 'calendar-outline'}
                    size={10}
                    color={dueTextColor}
                  />
                  <Text style={[styles.duePillText, { color: dueTextColor }]}>
                    {overdue ? `Overdue · ${dueLabel}` : dueLabel}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const nextDue = getNextDue(item);
    const repeatLabel = getRepeatLabel(item);
    const iconName = item.interval_type === 'specific' ? 'alarm' : item.interval_type === 'minutes' ? 'timer' : 'time';

    return (
      <View
        testID={`reminder-row-${item.id}`}
        style={[
          styles.reminderCard,
          { 
            backgroundColor: colors.surface,
            borderColor: item.is_active ? colors.accent + '30' : colors.border,
          },
          !item.is_active && styles.reminderInactive,
        ]}
      >
        <View style={styles.reminderHeader}>
          <View style={[
            styles.reminderIconBg,
            { backgroundColor: item.is_active ? colors.accent + '15' : colors.surfaceHighlight }
          ]}>
            <Ionicons name={iconName as any} size={18} color={item.is_active ? colors.accent : colors.textTertiary} />
          </View>
          <View style={styles.reminderBody}>
            <Text style={[
              styles.reminderTitle,
              { color: item.is_active ? colors.textPrimary : colors.textTertiary }
            ]}>
              {item.title}
            </Text>
            {item.note ? (
              <Text 
                style={[styles.reminderNote, { color: colors.textTertiary }]} 
                numberOfLines={1}
              >
                {item.note}
              </Text>
            ) : null}
          </View>
          <Switch
            testID={`reminder-toggle-${item.id}`}
            value={item.is_active}
            onValueChange={() => toggleReminderActive(item.id)}
            trackColor={{ false: colors.surfaceHighlight, true: colors.accent + '55' }}
            thumbColor={item.is_active ? colors.accent : colors.textTertiary}
            style={styles.reminderSwitch}
          />
        </View>
        
        <View style={[styles.reminderFooter, { borderTopColor: colors.border }]}>
          <View style={styles.reminderMeta}>
            <Ionicons name="repeat" size={12} color={colors.textTertiary} />
            <Text style={[styles.reminderMetaText, { color: colors.textTertiary }]}>
              {repeatLabel}
            </Text>
          </View>
          <View style={styles.reminderMeta}>
            <Ionicons 
              name="time-outline" 
              size={12} 
              color={item.is_active ? colors.accent : colors.textTertiary} 
            />
            <Text style={[
              styles.reminderMetaText,
              { color: item.is_active ? colors.accent : colors.textTertiary }
            ]}>
              {nextDue}
            </Text>
          </View>
          <TouchableOpacity
            testID={`reminder-edit-${item.id}`}
            style={styles.reminderActionBtn}
            onPress={() => router.push({ pathname: '/create-reminder', params: { id: item.id } } as any)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`reminder-delete-${item.id}`}
            style={styles.reminderActionBtn}
            onPress={() => deleteReminder(item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyTasks = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '10' }]}>
        <Ionicons name="checkbox-outline" size={40} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tasks yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Add daily tasks to build consistent habits.{"\n"}Check them off to build your streak.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyBtn, { backgroundColor: colors.accent }]} 
        onPress={() => router.push('/create-task')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyBtnText}>Add First Task</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyReminders = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '10' }]}>
        <Ionicons name="notifications-outline" size={40} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No reminders</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Set up recurring reminders to stay{"\n"}focused throughout the day.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyBtn, { backgroundColor: colors.accent }]} 
        onPress={() => router.push('/create-reminder')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyBtnText}>Add Reminder</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {activeTab === 'tasks' ? 'Tasks' : 'Reminders'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {activeTab === 'tasks'
              ? (routines.length > 0 ? `${doneToday} of ${routines.length} routines done` : 'Build your routine')
              : (reminders.length > 0 ? `${activeReminders} active` : 'Stay on track')
            }
          </Text>
        </View>
        <TouchableOpacity
          testID="add-item-btn"
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push(activeTab === 'tasks' ? '/create-task' : '/create-reminder')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surfaceHighlight }]}>
        <Animated.View
          style={[
            styles.tabIndicator,
            { backgroundColor: colors.surface },
            {
              transform: [{
                translateX: tabIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 4 + (styles.tabContainer as any).width / 2 || 170]
                })
              }]
            }
          ]}
        />
        <TouchableOpacity
          testID="tasks-tab-btn"
          style={styles.tab}
          onPress={() => switchTab('tasks')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'tasks' ? 'checkbox' : 'checkbox-outline'}
            size={16}
            color={activeTab === 'tasks' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'tasks' ? colors.textPrimary : colors.textTertiary }]}>
            Tasks
          </Text>
          {totalTasks > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'tasks' ? colors.accent : colors.textTertiary }]}>
              <Text style={styles.tabBadgeText}>{totalTasks}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          testID="reminders-tab-btn"
          style={styles.tab}
          onPress={() => switchTab('reminders')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'reminders' ? 'notifications' : 'notifications-outline'}
            size={16}
            color={activeTab === 'reminders' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'reminders' ? colors.textPrimary : colors.textTertiary }]}>
            Reminders
          </Text>
          {reminders.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'reminders' ? colors.accent : colors.textTertiary }]}>
              <Text style={styles.tabBadgeText}>{reminders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === 'tasks' ? (
        tasks.length === 0 ? renderEmptyTasks() : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── ROUTINES section ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ROUTINES</Text>
              {routines.length > 0 && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
                    <View style={[styles.progressFill, {
                      backgroundColor: colors.success,
                      width: `${routines.length > 0 ? (doneToday / routines.length) * 100 : 0}%`,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {doneToday}/{routines.length}
                  </Text>
                </View>
              )}
            </View>
            {routines.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: colors.border }]}>
                <Text style={[styles.sectionEmptyText, { color: colors.textTertiary }]}>No daily routines yet</Text>
              </View>
            ) : (
              routines.map(item => renderRoutine(item))
            )}

            {/* ── TO-DO section ── */}
            <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>TO-DO</Text>
              {oneTimes.length > 0 && (
                <Text style={[styles.progressText, { color: colors.textTertiary }]}>
                  {oneTimes.filter(t => t.is_completed).length}/{oneTimes.length} done
                </Text>
              )}
            </View>
            {oneTimes.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: colors.border }]}>
                <Text style={[styles.sectionEmptyText, { color: colors.textTertiary }]}>No one-time tasks yet</Text>
              </View>
            ) : (
              oneTimes.map(item => renderOneTime(item))
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        )
      ) : (
        reminders.length === 0 ? renderEmptyReminders() : (
          <FlatList
            data={reminders}
            keyExtractor={i => i.id}
            renderItem={renderReminder}
            ListHeaderComponent={() => (
              <View style={styles.listHeader}>
                <Text style={[styles.reminderSummary, { color: colors.textSecondary }]}>
                  {activeReminders} active · {reminders.length - activeReminders} paused
                </Text>
              </View>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xxl,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    position: 'relative' as const,
  },
  tabIndicator: {
    position: 'absolute' as const,
    top: 4,
    left: 0,
    width: '48%',
    height: 40,
    borderRadius: radius.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
    zIndex: 1,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.sm,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listHeader: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xs,
    letterSpacing: 1,
  },
  sectionEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionEmptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
    minWidth: 32,
    textAlign: 'right',
  },
  reminderSummary: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
    minHeight: 56,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  taskDone: {
    textDecorationLine: 'line-through',
  },
  taskDoneLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  checkboxSquare: {
    borderRadius: 5,
  },
  oneTimeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  duePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  duePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  reminderCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  reminderInactive: {
    opacity: 0.6,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  reminderIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderBody: {
    flex: 1,
  },
  reminderTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.base,
  },
  reminderNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  reminderSwitch: {
    transform: [{ scale: 0.85 }],
  },
  reminderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
  },
  reminderActionBtn: {
    padding: spacing.xs,
  },
});
