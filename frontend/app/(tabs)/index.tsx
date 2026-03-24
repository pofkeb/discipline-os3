import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

// ─── Helpers ───

const todayStr = (): string => new Date().toISOString().split('T')[0];

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

const isOverdue = (due_date: string | null): boolean => {
  if (!due_date) return false;
  return due_date < todayStr();
};

// ─── Component ───

export default function HomeScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [t, g, r, q, s] = await Promise.all([
      api.getTasks(), api.getGoals(), api.getReminders(), api.getDailyQuote(), api.getStats(),
    ]);
    setTasks(t); setGoals(g); setReminders(r); setQuote(q); setStats(s);
    setReady(true); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await api.toggleTask(id);
    setTasks(p => p.map(t => {
      if (t.id !== id) return t;
      if ((t.type ?? 'routine') === 'one_time') {
        return { ...t, is_completed: res.is_completed ?? false, completed_date: res.completed_date ?? null };
      }
      return { ...t, is_completed_today: res.is_completed_today ?? false };
    }));
  };

  // ─── Derived data ───

  const {
    nonNegotiables,
    negotiables,
    overdueTasks,
    upcomingTasks,
    goal,
    totalNodes,
    doneNodes,
    pct,
    activeReminders,
    streak,
    hasData,
  } = useMemo(() => {
    const today = todayStr();
    
    // Task type classification (migration shim for old 'routine' type)
    const isNonNeg = (type: string | undefined) => {
      const t = type ?? 'routine';
      return t === 'routine' || t === 'non_negotiable';
    };
    const isNeg = (type: string | undefined) => type === 'negotiable';
    const isOneTime = (type: string | undefined) => (type ?? 'routine') === 'one_time';

    // Split tasks by type
    const nonNegs = tasks.filter(t => isNonNeg(t.type));
    const negs = tasks.filter(t => isNeg(t.type));
    const oneTimes = tasks.filter(t => isOneTime(t.type));

    // Overdue one-time tasks (due before today, not completed)
    const overdue = oneTimes.filter(t => !t.is_completed && t.due_date && t.due_date < today);

    // Upcoming planned one-time tasks (due today or later, not completed)
    const upcoming = oneTimes
      .filter(t => !t.is_completed && t.due_date && t.due_date >= today)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 3); // Show max 3

    // Goal progress (first goal)
    const g = goals[0];
    let totalN = 0, doneN = 0;
    if (g) {
      (g.milestones || []).forEach((m: any) => {
        totalN++;
        if (m.is_completed) doneN++;
        (m.steps ?? []).forEach((s: any) => {
          totalN++;
          if (s.is_completed) doneN++;
        });
      });
    }
    const percentage = totalN > 0 ? doneN / totalN : 0;

    // Active reminders
    const activeRems = reminders.filter((r: any) => r.is_active);

    return {
      nonNegotiables: nonNegs,
      negotiables: negs,
      overdueTasks: overdue,
      upcomingTasks: upcoming,
      goal: g,
      totalNodes: totalN,
      doneNodes: doneN,
      pct: percentage,
      activeReminders: activeRems,
      streak: stats?.streak || 0,
      hasData: goals.length > 0 || tasks.length > 0,
    };
  }, [tasks, goals, reminders, stats]);

  const doneNonNeg = nonNegotiables.filter(t => t.is_completed_today).length;
  const doneNeg = negotiables.filter(t => t.is_completed_today).length;
  const allNonNegDone = nonNegotiables.length > 0 && doneNonNeg === nonNegotiables.length;

  if (!ready) return <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} />;

  // ─── Render helpers ───

  const renderTaskItem = (t: any, type: 'daily' | 'onetime') => {
    const isChecked = type === 'onetime' ? t.is_completed : t.is_completed_today;
    const isOver = type === 'onetime' && isOverdue(t.due_date);
    
    return (
      <TouchableOpacity
        key={t.id}
        style={[s.taskRow, { backgroundColor: c.surface }]}
        onPress={() => toggle(t.id)}
        activeOpacity={0.7}
      >
        <View style={[
          s.chk,
          type === 'onetime' && s.chkSquare,
          isChecked ? { backgroundColor: c.success, borderColor: c.success } : { borderColor: isOver ? c.error : c.textTertiary },
        ]}>
          {isChecked && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <View style={s.taskContent}>
          <Text
            style={[
              s.taskTxt,
              { color: isChecked ? c.textTertiary : isOver ? c.error : c.textPrimary },
              isChecked && s.taskDone,
            ]}
            numberOfLines={1}
          >
            {t.title}
          </Text>
          {type === 'onetime' && t.due_date && !isChecked && (
            <Text style={[s.taskMeta, { color: isOver ? c.error : c.textTertiary }]}>
              {isOver ? 'Overdue · ' : ''}{formatDueLabel(t.due_date)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accent} />}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.date, { color: c.textSecondary }]}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={[s.brand, { color: c.textPrimary }]}>DISCIPLINE OS</Text>
          </View>
          {streak > 0 && (
            <TouchableOpacity
              style={[s.streakPill, { backgroundColor: c.accent + '15' }]}
              onPress={() => router.push('/(tabs)/calendar')}
              activeOpacity={0.7}
            >
              <Ionicons name="flame" size={18} color={c.accent} />
              <Text style={[s.streakNum, { color: c.accent }]}>{streak}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Welcome Empty State ── */}
        {!hasData && (
          <View testID="welcome-state" style={[s.emptyHero, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.emptyIconRing, { borderColor: c.accent + '30' }]}>
              <Ionicons name="flash" size={32} color={c.accent} />
            </View>
            <Text style={[s.emptyTitle, { color: c.textPrimary }]}>Your journey starts now</Text>
            <Text style={[s.emptyDesc, { color: c.textSecondary }]}>
              Set a goal, add daily tasks, and build{'\n'}unstoppable discipline.
            </Text>
            <TouchableOpacity
              testID="welcome-create-goal-btn"
              style={[s.emptyBtn, { backgroundColor: c.accent }]}
              onPress={() => router.push('/create-goal')}
            >
              <Ionicons name="trophy-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnTxt}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Today's Summary Card ── */}
        {hasData && (
          <View style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.summaryRow}>
              {/* Non-neg progress */}
              <View style={s.summaryBlock}>
                <View style={s.summaryIconRow}>
                  <Ionicons name="shield-checkmark" size={14} color={allNonNegDone ? c.success : c.accent} />
                  <Text style={[s.summaryLabel, { color: c.textTertiary }]}>NON-NEG</Text>
                </View>
                <Text style={[s.summaryBig, { color: allNonNegDone ? c.success : c.textPrimary }]}>
                  {doneNonNeg}<Text style={[s.summarySmall, { color: c.textTertiary }]}>/{nonNegotiables.length}</Text>
                </Text>
              </View>

              {/* Negotiables progress */}
              {negotiables.length > 0 && (
                <View style={s.summaryBlock}>
                  <View style={s.summaryIconRow}>
                    <Ionicons name="repeat" size={14} color={c.textTertiary} />
                    <Text style={[s.summaryLabel, { color: c.textTertiary }]}>FLEX</Text>
                  </View>
                  <Text style={[s.summaryBig, { color: c.textPrimary }]}>
                    {doneNeg}<Text style={[s.summarySmall, { color: c.textTertiary }]}>/{negotiables.length}</Text>
                  </Text>
                </View>
              )}

              {/* Goal progress */}
              {goal && totalNodes > 0 && (
                <View style={s.summaryBlock}>
                  <View style={s.summaryIconRow}>
                    <Ionicons name="flag" size={14} color={c.accent} />
                    <Text style={[s.summaryLabel, { color: c.textTertiary }]}>GOAL</Text>
                  </View>
                  <Text style={[s.summaryBig, { color: c.textPrimary }]}>
                    {Math.round(pct * 100)}<Text style={[s.summarySmall, { color: c.textTertiary }]}>%</Text>
                  </Text>
                </View>
              )}

              {/* Overdue count (if any) */}
              {overdueTasks.length > 0 && (
                <View style={s.summaryBlock}>
                  <View style={s.summaryIconRow}>
                    <Ionicons name="alert-circle" size={14} color={c.error} />
                    <Text style={[s.summaryLabel, { color: c.error }]}>DUE</Text>
                  </View>
                  <Text style={[s.summaryBig, { color: c.error }]}>{overdueTasks.length}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Quote ── */}
        {quote && (
          <View style={[s.quoteCard, { borderLeftColor: c.accent, backgroundColor: c.surface }]}>
            <Text style={[s.quoteText, { color: c.textPrimary }]}>"{quote.text}"</Text>
            <Text style={[s.quoteAuthor, { color: c.textTertiary }]}>— {quote.author}</Text>
          </View>
        )}

        {/* ── Non-Negotiables Section ── */}
        {nonNegotiables.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={c.accent} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>NON-NEGOTIABLES</Text>
              </View>
              <Text style={[s.sectionCount, { color: allNonNegDone ? c.success : c.textTertiary }]}>
                {doneNonNeg}/{nonNegotiables.length}
              </Text>
            </View>
            <View style={[s.taskList, { borderColor: c.border }]}>
              {nonNegotiables.map(t => renderTaskItem(t, 'daily'))}
            </View>
          </View>
        )}

        {/* ── Negotiables Section ── */}
        {negotiables.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="repeat-outline" size={14} color={c.textSecondary} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>NEGOTIABLES</Text>
              </View>
              <Text style={[s.sectionCount, { color: c.textTertiary }]}>{doneNeg}/{negotiables.length}</Text>
            </View>
            <View style={[s.taskList, { borderColor: c.border }]}>
              {negotiables.map(t => renderTaskItem(t, 'daily'))}
            </View>
          </View>
        )}

        {/* ── Overdue Tasks Section ── */}
        {overdueTasks.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="alert-circle-outline" size={14} color={c.error} />
                <Text style={[s.sectionTitle, { color: c.error }]}>OVERDUE</Text>
              </View>
              <Text style={[s.sectionCount, { color: c.error }]}>{overdueTasks.length}</Text>
            </View>
            <View style={[s.taskList, { borderColor: c.error + '40' }]}>
              {overdueTasks.map(t => renderTaskItem(t, 'onetime'))}
            </View>
          </View>
        )}

        {/* ── Upcoming Planned Tasks ── */}
        {upcomingTasks.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="calendar-outline" size={14} color={c.textSecondary} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>UPCOMING</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[s.sectionLink, { color: c.accent }]}>Plan →</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.taskList, { borderColor: c.border }]}>
              {upcomingTasks.map(t => renderTaskItem(t, 'onetime'))}
            </View>
          </View>
        )}

        {/* ── Current Goal ── */}
        {goal && (
          <TouchableOpacity
            testID="active-goal-card"
            style={[s.goalCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push(`/goal/${goal.id}`)}
            activeOpacity={0.7}
          >
            <View style={s.goalHead}>
              <Ionicons name="trophy" size={14} color={c.accent} />
              <Text style={[s.goalLabel, { color: c.textTertiary }]}>CURRENT GOAL</Text>
              <Ionicons name="chevron-forward" size={14} color={c.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={[s.goalName, { color: c.textPrimary }]} numberOfLines={1}>{goal.title}</Text>
            {totalNodes > 0 && (
              <View style={s.goalProg}>
                <View style={[s.goalProgBg, { backgroundColor: c.surfaceHighlight }]}>
                  <View style={[s.goalProgFill, { backgroundColor: c.accent, width: `${pct * 100}%` }]} />
                </View>
                <Text style={[s.goalProgTxt, { color: c.textSecondary }]}>{doneNodes}/{totalNodes}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Reminders Glance ── */}
        {activeReminders.length > 0 && (
          <TouchableOpacity
            style={[s.remindersCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/(tabs)/tasks')}
            activeOpacity={0.7}
          >
            <View style={s.remindersHead}>
              <Ionicons name="notifications" size={14} color={c.accent} />
              <Text style={[s.remindersLabel, { color: c.textTertiary }]}>
                {activeReminders.length} ACTIVE REMINDER{activeReminders.length !== 1 ? 'S' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={c.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={[s.reminderPreview, { color: c.textPrimary }]} numberOfLines={1}>
              {activeReminders[0].title}
              {activeReminders.length > 1 && (
                <Text style={{ color: c.textTertiary }}> +{activeReminders.length - 1} more</Text>
              )}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <View style={s.quickRow}>
          {[
            { id: 'goal', icon: 'trophy-outline', label: 'Goal', route: '/create-goal' },
            { id: 'task', icon: 'checkbox-outline', label: 'Task', route: '/create-task' },
            { id: 'reminder', icon: 'notifications-outline', label: 'Reminder', route: '/create-reminder' },
          ].map(q => (
            <TouchableOpacity
              key={q.id}
              testID={`quick-add-${q.id}-btn`}
              style={[s.quickBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push(q.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={q.icon as any} size={18} color={c.accent} />
              <Text style={[s.quickLabel, { color: c.textPrimary }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  date: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  brand: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, letterSpacing: 1 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakNum: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },

  // Summary card
  summaryCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryBlock: { alignItems: 'center', minWidth: 50 },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  summaryLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 9, letterSpacing: 0.5 },
  summaryBig: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 28 },
  summarySmall: { fontSize: 16 },

  // Quote
  quoteCard: {
    padding: spacing.md,
    paddingLeft: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    marginBottom: spacing.md,
  },
  quoteText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 6 },

  // Sections
  section: { marginBottom: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 13, letterSpacing: 1 },
  sectionCount: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  sectionLink: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  // Task list
  taskList: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  chk: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chkSquare: { borderRadius: 4 },
  taskContent: { flex: 1 },
  taskTxt: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  taskDone: { textDecorationLine: 'line-through' },
  taskMeta: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },

  // Goal card
  goalCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  goalLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 10, letterSpacing: 1 },
  goalName: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.base, marginBottom: 8 },
  goalProg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalProgBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  goalProgFill: { height: '100%', borderRadius: 2, minWidth: 2 },
  goalProgTxt: { fontFamily: 'Inter_500Medium', fontSize: 11 },

  // Reminders card
  remindersCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  remindersHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  remindersLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 10, letterSpacing: 1 },
  reminderPreview: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },

  // Empty state
  emptyHero: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 0.5 },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  emptyBtnTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: fontSize.sm },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
});
