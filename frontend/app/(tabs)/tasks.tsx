import { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, ActivityIndicator, Alert, Switch, Animated, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import type { ReminderIntervalType } from '../../src/services/notifications';
import * as Haptics from 'expo-haptics';

type Task = {
  id: string;
  title: string;
  type: 'non_negotiable' | 'negotiable' | 'routine' | 'one_time' | undefined;
  due_date: string | null;
  is_completed_today: boolean;
  is_completed: boolean;
  completed_date: string | null;
  created_at: string;
};
type Reminder = { id: string; title: string; note?: string; interval_type: ReminderIntervalType; interval_value: number; specific_time?: string; is_active: boolean };

type TabKey = 'tasks' | 'plan' | 'reminders';

// ─── Date helpers ───
const todayStr = (): string => new Date().toISOString().split('T')[0];

const toDateStr = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getMonthGrid = (year: number, month: number): (number | null)[][] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TasksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  // Planner state
  const now = new Date();
  const [planYear, setPlanYear] = useState(now.getFullYear());
  const [planMonth, setPlanMonth] = useState(now.getMonth());
  const [selectedPlanDay, setSelectedPlanDay] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([api.getTasks(), api.getReminders()]);
      setTasks(t);
      setReminders(r);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const switchTab = (tab: TabKey) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
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
  const nonNegotiables = tasks.filter(t => {
    const type = t.type ?? 'routine';
    return type === 'routine' || type === 'non_negotiable';
  });
  const negotiables = tasks.filter(t => t.type === 'negotiable');
  const oneTimes = tasks.filter(t => (t.type ?? 'routine') === 'one_time');

  const doneNonNeg = nonNegotiables.filter(t => t.is_completed_today).length;
  const doneNeg = negotiables.filter(t => t.is_completed_today).length;
  const totalTasks = tasks.length;
  const activeReminders = reminders.filter(r => r.is_active).length;

  // ─── Planner: tasks grouped by future due_date ───
  const futureTasks = useMemo(() => {
    const today = todayStr();
    return oneTimes.filter(t => !t.is_completed && t.due_date && t.due_date >= today);
  }, [oneTimes]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    futureTasks.forEach(t => {
      if (t.due_date) {
        if (!map[t.due_date]) map[t.due_date] = [];
        map[t.due_date].push(t);
      }
    });
    return map;
  }, [futureTasks]);

  // ─── Planner: selected day tasks ───
  const selectedDayTasks = selectedPlanDay ? (tasksByDate[selectedPlanDay] || []) : [];

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
  const renderOneTime = (item: Task, showDue = true) => {
    const overdue = !item.is_completed && isOverdue(item.due_date);
    const dueLabel = formatDueLabel(item.due_date);
    const doneLabel = formatCompletedDate(item.completed_date);

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
              showDue && item.due_date && (
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
        Add daily tasks to build consistent habits.{"\n"}Non-negotiables drive your streak.
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
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No reminders yet</Text>
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

  // ─── Planner month navigation ───
  const prevPlanMonth = () => {
    Haptics.selectionAsync();
    const today = new Date();
    // Can't go before current month
    if (planYear === today.getFullYear() && planMonth <= today.getMonth()) return;
    if (planMonth === 0) { setPlanYear(y => y - 1); setPlanMonth(11); }
    else setPlanMonth(m => m - 1);
    setSelectedPlanDay(null);
  };

  const nextPlanMonth = () => {
    Haptics.selectionAsync();
    if (planMonth === 11) { setPlanYear(y => y + 1); setPlanMonth(0); }
    else setPlanMonth(m => m + 1);
    setSelectedPlanDay(null);
  };

  const selectPlanDay = (ds: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlanDay(ds === selectedPlanDay ? null : ds);
  };

  const createTaskForDay = (dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/create-task', params: { prefillDate: dateStr, prefillType: 'one_time' } } as any);
  };

  // ─── Planner calendar grid ───
  const planWeeks = getMonthGrid(planYear, planMonth);
  const today = todayStr();
  const cellSize = Math.floor((screenWidth - spacing.lg * 2) / 7);
  const canGoPrevMonth = !(planYear === now.getFullYear() && planMonth <= now.getMonth());

  // ─── Render Planner ───
  const renderPlanner = () => (
    <ScrollView contentContainerStyle={styles.plannerScroll} showsVerticalScrollIndicator={false}>
      {/* Month navigation */}
      <View style={styles.planMonthNav}>
        <TouchableOpacity
          onPress={prevPlanMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ opacity: canGoPrevMonth ? 1 : 0.25 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.planMonthCenter}>
          <Text style={[styles.planMonthName, { color: colors.textPrimary }]}>
            {MONTH_NAMES[planMonth].toUpperCase()} {planYear}
          </Text>
          <Text style={[styles.planMonthSub, { color: colors.textTertiary }]}>
            {futureTasks.length} task{futureTasks.length !== 1 ? 's' : ''} planned
          </Text>
        </View>
        <TouchableOpacity onPress={nextPlanMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.planDowRow}>
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={[styles.planCell, { width: cellSize }]}>
            <Text style={[styles.planDowLabel, { color: colors.textTertiary }]}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {planWeeks.map((week, wi) => (
        <View key={wi} style={styles.planWeek}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={[styles.planCell, { width: cellSize }]} />;
            const ds = toDateStr(planYear, planMonth, day);
            const isPast = ds < today;
            const isToday = ds === today;
            const isSel = ds === selectedPlanDay;
            const tasksOnDay = tasksByDate[ds] || [];
            const hasTask = tasksOnDay.length > 0;

            let circleBg = 'transparent';
            if (hasTask && !isPast) circleBg = colors.accent;

            let numColor = colors.textPrimary;
            if (isPast) numColor = colors.textTertiary;
            if (hasTask && !isPast) numColor = '#fff';

            return (
              <TouchableOpacity
                key={di}
                style={[styles.planCell, { width: cellSize }]}
                onPress={() => !isPast && selectPlanDay(ds)}
                onLongPress={() => !isPast && createTaskForDay(ds)}
                activeOpacity={isPast ? 1 : 0.7}
                disabled={isPast}
              >
                <View style={[
                  styles.planDayCircle,
                  { backgroundColor: circleBg },
                  isToday && !isSel && { borderWidth: 2, borderColor: colors.accent },
                  isSel && { borderWidth: 2, borderColor: colors.textSecondary },
                ]}>
                  <Text style={[styles.planDayNum, { color: numColor }]}>{day}</Text>
                </View>
                {/* Task count badge */}
                {hasTask && !isPast && tasksOnDay.length > 1 && (
                  <View style={[styles.planBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.planBadgeText, { color: colors.accent }]}>{tasksOnDay.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={[styles.planLegend, { borderTopColor: colors.border }]}>
        <View style={styles.planLegendItem}>
          <View style={[styles.planLegendCircle, { backgroundColor: colors.accent }]} />
          <Text style={[styles.planLegendLabel, { color: colors.textTertiary }]}>Planned</Text>
        </View>
        <Text style={[styles.planLegendTip, { color: colors.textTertiary }]}>
          Long-press a day to plan
        </Text>
      </View>

      {/* Selected day detail */}
      {selectedPlanDay && (
        <View style={[styles.planDetail, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planDetailHeader}>
            <Text style={[styles.planDetailDate, { color: colors.textTertiary }]}>
              {new Date(selectedPlanDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
            <TouchableOpacity
              style={[styles.planDetailAddBtn, { backgroundColor: colors.accent }]}
              onPress={() => createTaskForDay(selectedPlanDay)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedDayTasks.length === 0 ? (
            <View style={styles.planDetailEmpty}>
              <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} />
              <Text style={[styles.planDetailEmptyText, { color: colors.textTertiary }]}>
                No tasks planned
              </Text>
            </View>
          ) : (
            <View style={styles.planDetailTasks}>
              {selectedDayTasks.map(t => renderOneTime(t, false))}
            </View>
          )}
        </View>
      )}

      {/* Empty state when no future tasks */}
      {futureTasks.length === 0 && !selectedPlanDay && (
        <View style={[styles.planEmptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
          <Text style={[styles.planEmptyTitle, { color: colors.textPrimary }]}>No upcoming tasks</Text>
          <Text style={[styles.planEmptyDesc, { color: colors.textTertiary }]}>
            Long-press any future day to plan a one-time task
          </Text>
        </View>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );

  // ─── Get header title/subtitle based on tab ───
  const getHeaderInfo = () => {
    if (activeTab === 'tasks') {
      return {
        title: 'Tasks',
        subtitle: nonNegotiables.length > 0
          ? `${doneNonNeg} of ${nonNegotiables.length} non-neg done`
          : 'Build your daily routine',
      };
    }
    if (activeTab === 'plan') {
      return {
        title: 'Plan',
        subtitle: futureTasks.length > 0
          ? `${futureTasks.length} task${futureTasks.length !== 1 ? 's' : ''} scheduled`
          : 'Plan your upcoming tasks',
      };
    }
    return {
      title: 'Reminders',
      subtitle: reminders.length > 0 ? `${activeReminders} active` : 'Stay on track',
    };
  };

  const headerInfo = getHeaderInfo();

  // ─── Get add button action ───
  const handleAdd = () => {
    if (activeTab === 'tasks') router.push('/create-task');
    else if (activeTab === 'plan') {
      // Pre-fill with tomorrow if no day selected
      const targetDate = selectedPlanDay || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })();
      router.push({ pathname: '/create-task', params: { prefillDate: targetDate, prefillType: 'one_time' } } as any);
    }
    else router.push('/create-reminder');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{headerInfo.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{headerInfo.subtitle}</Text>
        </View>
        <TouchableOpacity
          testID="add-item-btn"
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={handleAdd}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs: Tasks | Plan | Reminders */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surfaceHighlight }]}>
        {(['tasks', 'plan', 'reminders'] as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          const icon = tab === 'tasks' ? (isActive ? 'checkbox' : 'checkbox-outline')
            : tab === 'plan' ? (isActive ? 'calendar' : 'calendar-outline')
            : (isActive ? 'notifications' : 'notifications-outline');
          const label = tab === 'tasks' ? 'Tasks' : tab === 'plan' ? 'Plan' : 'Reminders';
          const badge = tab === 'tasks' ? totalTasks : tab === 'plan' ? futureTasks.length : reminders.length;

          return (
            <TouchableOpacity
              key={tab}
              testID={`${tab}-tab-btn`}
              style={[
                styles.tab,
                isActive && { backgroundColor: colors.surface, borderRadius: radius.sm },
              ]}
              onPress={() => switchTab(tab)}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={15} color={isActive ? colors.accent : colors.textTertiary} />
              <Text style={[styles.tabText, { color: isActive ? colors.textPrimary : colors.textTertiary }]}>
                {label}
              </Text>
              {badge > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.accent : colors.textTertiary }]}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
            {/* NON-NEGOTIABLES section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NON-NEGOTIABLES</Text>
              {nonNegotiables.length > 0 && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
                    <View style={[styles.progressFill, {
                      backgroundColor: colors.success,
                      width: `${nonNegotiables.length > 0 ? (doneNonNeg / nonNegotiables.length) * 100 : 0}%`,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {doneNonNeg}/{nonNegotiables.length}
                  </Text>
                </View>
              )}
            </View>
            {nonNegotiables.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: colors.border }]}>
                <Text style={[styles.sectionEmptyText, { color: colors.textTertiary }]}>Add tasks you must do every day</Text>
              </View>
            ) : (
              nonNegotiables.map(item => renderRoutine(item))
            )}

            {/* NEGOTIABLES section */}
            <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NEGOTIABLES</Text>
              {negotiables.length > 0 && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
                    <View style={[styles.progressFill, {
                      backgroundColor: colors.success,
                      width: `${(doneNeg / negotiables.length) * 100}%`,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {doneNeg}/{negotiables.length}
                  </Text>
                </View>
              )}
            </View>
            {negotiables.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: colors.border }]}>
                <Text style={[styles.sectionEmptyText, { color: colors.textTertiary }]}>Add flexible daily tasks here</Text>
              </View>
            ) : (
              negotiables.map(item => renderRoutine(item))
            )}

            {/* TO-DO section */}
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
                <Text style={[styles.sectionEmptyText, { color: colors.textTertiary }]}>No to-dos yet</Text>
              </View>
            ) : (
              oneTimes.map(item => renderOneTime(item))
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        )
      ) : activeTab === 'plan' ? (
        renderPlanner()
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
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xxl,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderRadius: radius.sm,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.xs,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listHeader: { marginBottom: spacing.md },
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
  taskContent: { flex: 1 },
  taskText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  taskDone: { textDecorationLine: 'line-through' },
  taskDoneLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  checkboxSquare: { borderRadius: 5 },
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
  reminderInactive: { opacity: 0.6 },
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
  reminderBody: { flex: 1 },
  reminderTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.base,
  },
  reminderNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  reminderSwitch: { transform: [{ scale: 0.85 }] },
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
  reminderActionBtn: { padding: spacing.xs },

  // ─── Planner styles ───
  plannerScroll: { paddingHorizontal: spacing.lg },
  planMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planMonthCenter: { alignItems: 'center' },
  planMonthName: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  planMonthSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  planDowRow: { flexDirection: 'row', marginBottom: 4 },
  planDowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
  },
  planWeek: { flexDirection: 'row' },
  planCell: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  planDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDayNum: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  planBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
  },
  planLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 0.5,
    marginBottom: spacing.lg,
  },
  planLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  planLegendCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planLegendLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  planLegendTip: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
  },
  planDetail: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planDetailDate: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xs,
    letterSpacing: 1,
  },
  planDetailAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planDetailEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  planDetailEmptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
  },
  planDetailTasks: { gap: spacing.sm },
  planEmptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  planEmptyTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.lg,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  planEmptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
