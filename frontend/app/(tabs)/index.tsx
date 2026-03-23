import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

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
    setTasks(p => p.map(t => t.id === id ? { ...t, is_completed_today: res.is_completed } : t));
  };

  if (!ready) return <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} />;

  const goal = goals[0];
  const doneToday = tasks.filter(t => t.is_completed_today).length;
  const total = tasks.length;
  const streak = stats?.streak || 0;
  const mDone = goal ? goal.milestones.filter((m: any) => m.is_completed).length : 0;
  const mTotal = goal ? goal.milestones.length : 0;
  const pct = mTotal > 0 ? mDone / mTotal : 0;
  const hasData = goals.length > 0 || tasks.length > 0;
  const activeReminders = reminders.filter((r: any) => r.is_active);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accent} />}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.date, { color: c.textSecondary }]}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={[s.brand, { color: c.textPrimary }]}>DISCIPLINE OS</Text>
          </View>
          {streak > 0 && (
            <View style={[s.streakPill, { backgroundColor: c.accent + '15' }]}>
              <Ionicons name="flame" size={18} color={c.accent} />
              <Text style={[s.streakNum, { color: c.accent }]}>{streak}</Text>
            </View>
          )}
        </View>

        {/* Today's Focus — the core motivational block */}
        {hasData && (
          <View style={[s.focusCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.focusLabel, { color: c.textTertiary }]}>TODAY'S FOCUS</Text>
            <View style={s.focusRow}>
              <View style={s.focusStatBlock}>
                <Text style={[s.focusBig, { color: total > 0 && doneToday === total ? c.success : c.accent }]}>{doneToday}<Text style={[s.focusSmall, { color: c.textTertiary }]}>/{total}</Text></Text>
                <Text style={[s.focusStatLabel, { color: c.textSecondary }]}>tasks done</Text>
              </View>
              {goal && mTotal > 0 && (
                <View style={s.focusStatBlock}>
                  <Text style={[s.focusBig, { color: c.accent }]}>{Math.round(pct * 100)}<Text style={[s.focusSmall, { color: c.textTertiary }]}>%</Text></Text>
                  <Text style={[s.focusStatLabel, { color: c.textSecondary }]}>goal progress</Text>
                </View>
              )}
              {activeReminders.length > 0 && (
                <View style={s.focusStatBlock}>
                  <Text style={[s.focusBig, { color: c.accent }]}>{activeReminders.length}</Text>
                  <Text style={[s.focusStatLabel, { color: c.textSecondary }]}>reminders</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Welcome empty state */}
        {!hasData && (
          <View testID="welcome-state" style={[s.emptyHero, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.emptyIconRing, { borderColor: c.accent + '30' }]}>
              <Ionicons name="flash" size={32} color={c.accent} />
            </View>
            <Text style={[s.emptyTitle, { color: c.textPrimary }]}>Your journey starts now</Text>
            <Text style={[s.emptyDesc, { color: c.textSecondary }]}>Set a goal, add daily tasks, and build{'\n'}unstoppable discipline.</Text>
            <TouchableOpacity testID="welcome-create-goal-btn" style={[s.emptyBtn, { backgroundColor: c.accent }]} onPress={() => router.push('/create-goal')}>
              <Ionicons name="trophy-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnTxt}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quote */}
        {quote && (
          <View style={[s.quoteCard, { borderLeftColor: c.accent, backgroundColor: c.surface }]}>
            <Text style={[s.quoteText, { color: c.textPrimary }]}>"{quote.text}"</Text>
            <Text style={[s.quoteAuthor, { color: c.textTertiary }]}>— {quote.author}</Text>
          </View>
        )}

        {/* Active Goal */}
        {goal && (
          <TouchableOpacity testID="active-goal-card" style={[s.goalCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push(`/goal/${goal.id}`)} activeOpacity={0.7}>
            <View style={s.goalHead}>
              <Ionicons name="trophy" size={16} color={c.accent} />
              <Text style={[s.goalLabel, { color: c.textTertiary }]}>CURRENT GOAL</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={[s.goalName, { color: c.textPrimary }]}>{goal.title}</Text>
            {mTotal > 0 && (
              <View style={s.goalProg}>
                <View style={[s.goalProgBg, { backgroundColor: c.surfaceHighlight }]}>
                  <View style={[s.goalProgFill, { backgroundColor: c.accent, width: `${pct * 100}%` }]} />
                </View>
                <Text style={[s.goalProgTxt, { color: c.textSecondary }]}>{mDone}/{mTotal}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Today's Tasks */}
        {tasks.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: c.textPrimary }]}>TASKS</Text>
              <TouchableOpacity testID="add-task-home-btn" onPress={() => router.push('/create-task')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="add-circle" size={22} color={c.accent} />
              </TouchableOpacity>
            </View>
            {tasks.map(t => (
              <TouchableOpacity key={t.id} testID={`task-item-${t.id}`}
                style={[s.taskRow, { borderBottomColor: c.border }]}
                onPress={() => toggle(t.id)} activeOpacity={0.6}>
                <View style={[s.chk, t.is_completed_today && { backgroundColor: c.accent, borderColor: c.accent }, !t.is_completed_today && { borderColor: c.textTertiary }]}>
                  {t.is_completed_today && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[s.taskTxt, { color: t.is_completed_today ? c.textTertiary : c.textPrimary }, t.is_completed_today && s.taskDone]}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reminders summary */}
        {activeReminders.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: c.textPrimary }]}>REMINDERS</Text>
            </View>
            {activeReminders.slice(0, 3).map((r: any) => (
              <View key={r.id} style={[s.remRow, { borderBottomColor: c.border }]}>
                <Ionicons name={r.interval_type === 'specific' ? 'alarm-outline' : 'time-outline'} size={16} color={c.accent} />
                <Text style={[s.remTxt, { color: c.textPrimary }]}>{r.title}</Text>
                <Text style={[s.remMeta, { color: c.textTertiary }]}>
                  {r.interval_type === 'specific' ? `${r.specific_time}` : `${r.interval_value}${r.interval_type === 'hours' ? 'h' : 'm'}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick add */}
        <View style={s.quickRow}>
          {[
            { id: 'goal', icon: 'trophy-outline', label: 'Goal', route: '/create-goal' },
            { id: 'task', icon: 'checkbox-outline', label: 'Task', route: '/create-task' },
            { id: 'reminder', icon: 'notifications-outline', label: 'Reminder', route: '/create-reminder' },
          ].map(q => (
            <TouchableOpacity key={q.id} testID={`quick-add-${q.id}-btn`}
              style={[s.quickBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push(q.route as any)} activeOpacity={0.7}>
              <Ionicons name={q.icon as any} size={20} color={c.accent} />
              <Text style={[s.quickLabel, { color: c.textPrimary }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.lg },
  date: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  brand: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, letterSpacing: 1 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakNum: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },

  focusCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  focusLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: spacing.md },
  focusRow: { flexDirection: 'row', gap: spacing.xl },
  focusStatBlock: { alignItems: 'flex-start' },
  focusBig: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 36 },
  focusSmall: { fontSize: 20 },
  focusStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: -2 },

  emptyHero: { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, alignItems: 'center' },
  emptyIconRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 0.5 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.lg },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.lg },
  emptyBtnTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: fontSize.sm },

  quoteCard: { padding: spacing.md, paddingLeft: spacing.lg, borderRadius: radius.md, borderLeftWidth: 3, marginBottom: spacing.md },
  quoteText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 6 },

  goalCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  goalLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 11, letterSpacing: 1 },
  goalName: { fontFamily: 'Inter_700Bold', fontSize: fontSize.lg, marginBottom: spacing.sm },
  goalProg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalProgBg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  goalProgFill: { height: '100%', borderRadius: 3, minWidth: 2 },
  goalProgTxt: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  section: { marginBottom: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, letterSpacing: 1 },

  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  chk: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  taskTxt: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, flex: 1 },
  taskDone: { textDecorationLine: 'line-through' },

  remRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  remTxt: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, flex: 1 },
  remMeta: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: 4 },
  quickLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
});
