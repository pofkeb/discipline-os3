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
    const isNonNeg = (type: string | undefined) => {
      const t = type ?? 'routine';
      return t === 'routine' || t === 'non_negotiable';
    };
    const isNeg = (type: string | undefined) => type === 'negotiable';
    const isOneTime = (type: string | undefined) => (type ?? 'routine') === 'one_time';

    const nonNegs = tasks.filter(t => isNonNeg(t.type));
    const negs = tasks.filter(t => isNeg(t.type));
    const oneTimes = tasks.filter(t => isOneTime(t.type));
    const overdue = oneTimes.filter(t => !t.is_completed && t.due_date && t.due_date < today);
    const upcoming = oneTimes
      .filter(t => !t.is_completed && t.due_date && t.due_date >= today)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 3);

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

  // ─── Render task item ───

  const renderTaskItem = (t: any, type: 'daily' | 'onetime', isLast: boolean) => {
    const isChecked = type === 'onetime' ? t.is_completed : t.is_completed_today;
    const isOver = type === 'onetime' && isOverdue(t.due_date);
    
    return (
      <TouchableOpacity
        key={t.id}
        style={[
          s.taskRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: c.border },
        ]}
        onPress={() => toggle(t.id)}
        activeOpacity={0.6}
      >
        <View style={[
          s.chk,
          type === 'onetime' && s.chkSquare,
          isChecked ? { backgroundColor: c.success, borderColor: c.success } : { borderColor: isOver ? c.error : c.textTertiary },
        ]}>
          {isChecked && <Ionicons name="checkmark" size={11} color="#fff" />}
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
            <Text style={[s.date, { color: c.textTertiary }]}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={[s.brand, { color: c.textPrimary }]}>DISCIPLINE OS</Text>
          </View>
          {streak > 0 && (
            <TouchableOpacity
              style={[s.streakPill, { backgroundColor: c.accent + '12' }]}
              onPress={() => router.push('/(tabs)/calendar')}
              activeOpacity={0.7}
            >
              <Text style={s.streakIcon}>🔥</Text>
              <Text style={[s.streakNum, { color: c.accent }]}>{streak}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Welcome Empty State ── */}
        {!hasData && (
          <View testID="welcome-state" style={[s.emptyHero, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.emptyIconRing, { backgroundColor: c.accent + '10' }]}>
              <Ionicons name="flash" size={28} color={c.accent} />
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
              <Ionicons name="trophy-outline" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Summary Stats ── */}
        {hasData && (
          <View style={[s.statsRow]}>
            {/* Non-neg stat */}
            <View style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[s.statIconWrap, { backgroundColor: allNonNegDone ? c.success + '15' : c.accent + '10' }]}>
                <Ionicons name="shield-checkmark" size={16} color={allNonNegDone ? c.success : c.accent} />
              </View>
              <Text style={[s.statValue, { color: allNonNegDone ? c.success : c.textPrimary }]}>
                {doneNonNeg}/{nonNegotiables.length}
              </Text>
              <Text style={[s.statLabel, { color: c.textTertiary }]}>Non-Neg</Text>
            </View>

            {/* Goal progress */}
            {goal && totalNodes > 0 && (
              <TouchableOpacity
                style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => router.push(`/goal/${goal.id}`)}
                activeOpacity={0.7}
              >
                <View style={[s.statIconWrap, { backgroundColor: c.accent + '10' }]}>
                  <Ionicons name="flag" size={16} color={c.accent} />
                </View>
                <Text style={[s.statValue, { color: c.textPrimary }]}>{Math.round(pct * 100)}%</Text>
                <Text style={[s.statLabel, { color: c.textTertiary }]}>Goal</Text>
              </TouchableOpacity>
            )}

            {/* Overdue badge */}
            {overdueTasks.length > 0 && (
              <View style={[s.statCard, { backgroundColor: c.error + '08', borderColor: c.error + '30' }]}>
                <View style={[s.statIconWrap, { backgroundColor: c.error + '15' }]}>
                  <Ionicons name="alert-circle" size={16} color={c.error} />
                </View>
                <Text style={[s.statValue, { color: c.error }]}>{overdueTasks.length}</Text>
                <Text style={[s.statLabel, { color: c.error }]}>Overdue</Text>
              </View>
            )}

            {/* Reminders count */}
            {activeReminders.length > 0 && !overdueTasks.length && (
              <TouchableOpacity
                style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => router.push('/(tabs)/tasks')}
                activeOpacity={0.7}
              >
                <View style={[s.statIconWrap, { backgroundColor: c.accent + '10' }]}>
                  <Ionicons name="notifications" size={16} color={c.accent} />
                </View>
                <Text style={[s.statValue, { color: c.textPrimary }]}>{activeReminders.length}</Text>
                <Text style={[s.statLabel, { color: c.textTertiary }]}>Reminders</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Quote ── */}
        {quote && (
          <View style={[s.quoteCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.quoteMark, { backgroundColor: c.accent }]} />
            <View style={s.quoteContent}>
              <Text style={[s.quoteText, { color: c.textPrimary }]}>{quote.text}</Text>
              <Text style={[s.quoteAuthor, { color: c.textTertiary }]}>— {quote.author}</Text>
            </View>
          </View>
        )}

        {/* ── Non-Negotiables ── */}
        {nonNegotiables.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <View style={[s.sectionDot, { backgroundColor: allNonNegDone ? c.success : c.accent }]} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>NON-NEGOTIABLES</Text>
              </View>
              <Text style={[s.sectionCount, { color: allNonNegDone ? c.success : c.textTertiary }]}>
                {doneNonNeg}/{nonNegotiables.length}
              </Text>
            </View>
            <View style={[s.taskList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {nonNegotiables.map((t, i) => renderTaskItem(t, 'daily', i === nonNegotiables.length - 1))}
            </View>
          </View>
        )}

        {/* ── Negotiables ── */}
        {negotiables.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <View style={[s.sectionDot, { backgroundColor: c.textTertiary }]} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>NEGOTIABLES</Text>
              </View>
              <Text style={[s.sectionCount, { color: c.textTertiary }]}>{doneNeg}/{negotiables.length}</Text>
            </View>
            <View style={[s.taskList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {negotiables.map((t, i) => renderTaskItem(t, 'daily', i === negotiables.length - 1))}
            </View>
          </View>
        )}

        {/* ── Overdue ── */}
        {overdueTasks.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <View style={[s.sectionDot, { backgroundColor: c.error }]} />
                <Text style={[s.sectionTitle, { color: c.error }]}>OVERDUE</Text>
              </View>
            </View>
            <View style={[s.taskList, { backgroundColor: c.surface, borderColor: c.error + '30' }]}>
              {overdueTasks.map((t, i) => renderTaskItem(t, 'onetime', i === overdueTasks.length - 1))}
            </View>
          </View>
        )}

        {/* ── Upcoming ── */}
        {upcomingTasks.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <View style={[s.sectionDot, { backgroundColor: c.textTertiary }]} />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>UPCOMING</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[s.sectionLink, { color: c.accent }]}>View all →</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.taskList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {upcomingTasks.map((t, i) => renderTaskItem(t, 'onetime', i === upcomingTasks.length - 1))}
            </View>
          </View>
        )}

        {/* ── Goal Card ── */}
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
                <Text style={[s.goalProgTxt, { color: c.textTertiary }]}>{doneNodes}/{totalNodes}</Text>
              </View>
            )}
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  date: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs, letterSpacing: 0.5 },
  brand: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 1 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  streakIcon: { fontSize: 14 },
  streakNum: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xxs, marginTop: 2 },

  quoteCard: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  quoteMark: { width: 3 },
  quoteContent: { flex: 1, padding: spacing.md },
  quoteText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs, marginTop: spacing.sm },

  section: { marginBottom: spacing.lg },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.xs, letterSpacing: 1 },
  sectionCount: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },
  sectionLink: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },

  taskList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  chk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chkSquare: { borderRadius: 4 },
  taskContent: { flex: 1 },
  taskTxt: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  taskDone: { textDecorationLine: 'line-through' },
  taskMeta: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xxs, marginTop: 2 },

  goalCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  goalLabel: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.xxs, letterSpacing: 1 },
  goalName: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.base, marginBottom: spacing.sm },
  goalProg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalProgBg: { flex: 1, height: 5, borderRadius: 2.5, overflow: 'hidden' },
  goalProgFill: { height: '100%', borderRadius: 2.5, minWidth: 2 },
  goalProgTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },

  emptyHero: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 0.5 },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyBtnTxt: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: fontSize.sm },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickLabel: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },
});
