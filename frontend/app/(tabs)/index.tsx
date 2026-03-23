import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

type Task = { id: string; title: string; is_completed_today: boolean };
type Goal = { id: string; title: string; milestones: any[]; is_active: boolean };
type Reminder = { id: string; title: string; interval_type: string; interval_value: number };
type Quote = { text: string; author: string };

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [t, g, r, q, s] = await Promise.all([
        api.getTasks(), api.getGoals(), api.getReminders(), api.getDailyQuote(), api.getStats(),
      ]);
      setTasks(t);
      setGoals(g);
      setReminders(r);
      setQuote(q);
      setStats(s);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleTask = async (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.toggleTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: res.is_completed } : t));
    } catch {}
  };

  const activeGoal = goals.find(g => g.is_active) || goals[0];
  const completedToday = tasks.filter(t => t.is_completed_today).length;
  const totalTasks = tasks.length;
  const nextReminder = reminders[0];
  const hasNoData = goals.length === 0 && tasks.length === 0 && reminders.length === 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const milestonesDone = activeGoal ? activeGoal.milestones.filter((m: any) => m.is_completed).length : 0;
  const milestonesTotal = activeGoal ? activeGoal.milestones.length : 0;
  const goalProgress = milestonesTotal > 0 ? milestonesDone / milestonesTotal : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>DISCIPLINE OS</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color={colors.accent} />
            <Text style={[styles.streakText, { color: colors.accent }]}>{stats?.streak || 0}</Text>
          </View>
        </View>

        {/* Quote Card */}
        {quote && (
          <View testID="quote-card" style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{quote.text}"</Text>
            <Text style={[styles.quoteAuthor, { color: colors.textTertiary }]}>— {quote.author}</Text>
          </View>
        )}

        {/* First-use welcome state */}
        {hasNoData && (
          <View testID="welcome-state" style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="rocket-outline" size={36} color={colors.accent} />
            <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Your journey starts here</Text>
            <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>Set a goal, add daily tasks, and build unstoppable discipline.</Text>
            <View style={styles.welcomeActions}>
              <TouchableOpacity testID="welcome-create-goal-btn" style={[styles.welcomeBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/create-goal')} activeOpacity={0.8}>
                <Ionicons name="trophy-outline" size={18} color="#fff" />
                <Text style={styles.welcomeBtnText}>Set a Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="welcome-create-task-btn" style={[styles.welcomeBtnOutline, { borderColor: colors.border }]} onPress={() => router.push('/create-task')} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={colors.textPrimary} />
                <Text style={[styles.welcomeBtnOutlineText, { color: colors.textPrimary }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress Overview - only show when there's data */}
        {!hasNoData && (
          <View style={styles.progressRow}>
            <View testID="tasks-progress-card" style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.progressNumber, { color: colors.accent }]}>{completedToday}/{totalTasks}</Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
            </View>
            <View testID="goals-count-card" style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.progressNumber, { color: colors.accent }]}>{goals.length}</Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Active Goals</Text>
            </View>
            <View testID="milestones-count-card" style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.progressNumber, { color: colors.success }]}>{stats?.completed_milestones || 0}</Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Milestones</Text>
            </View>
          </View>
        )}

        {/* Active Goal */}
        {activeGoal && (
          <TouchableOpacity
            testID="active-goal-card"
            style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/goal/${activeGoal.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.goalHeader}>
              <Ionicons name="trophy" size={20} color={colors.accent} />
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>CURRENT GOAL</Text>
            </View>
            <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{activeGoal.title}</Text>
            {milestonesTotal > 0 && (
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressBg, { backgroundColor: colors.surfaceHighlight }]}>
                  <View style={[styles.goalProgressFill, { backgroundColor: colors.accent, width: `${goalProgress * 100}%` }]} />
                </View>
                <Text style={[styles.goalProgressText, { color: colors.textSecondary }]}>{milestonesDone}/{milestonesTotal}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Today's Tasks */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>TODAY'S TASKS</Text>
              <TouchableOpacity testID="add-task-home-btn" onPress={() => router.push('/create-task')}>
                <Ionicons name="add" size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
            {tasks.slice(0, 5).map(task => (
              <TouchableOpacity
                key={task.id}
                testID={`task-item-${task.id}`}
                style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => toggleTask(task.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, task.is_completed_today && { backgroundColor: colors.accent, borderColor: colors.accent }, !task.is_completed_today && { borderColor: colors.textTertiary }]}>
                  {task.is_completed_today && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.taskText, { color: task.is_completed_today ? colors.textTertiary : colors.textPrimary }, task.is_completed_today && styles.taskDone]}>{task.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Next Reminder */}
        {nextReminder && (
          <View testID="next-reminder-card" style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reminderHeader}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NEXT REMINDER</Text>
            </View>
            <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>{nextReminder.title}</Text>
            <Text style={[styles.reminderInterval, { color: colors.textSecondary }]}>
              Every {nextReminder.interval_value} {nextReminder.interval_type}
            </Text>
          </View>
        )}

        {/* Quick Actions - always visible */}
        <View style={styles.quickActions}>
          <TouchableOpacity testID="quick-add-goal-btn" style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/create-goal')} activeOpacity={0.7}>
            <Ionicons name="trophy-outline" size={22} color={colors.accent} />
            <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-task-btn" style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/create-task')} activeOpacity={0.7}>
            <Ionicons name="checkbox-outline" size={22} color={colors.accent} />
            <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>Task</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-reminder-btn" style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/create-reminder')} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={colors.accent} />
            <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>Reminder</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.lg },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
  appName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl },
  quoteCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  quoteText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, lineHeight: 22, fontStyle: 'italic' },
  quoteAuthor: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs, marginTop: spacing.sm },
  welcomeCard: { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, alignItems: 'center', gap: spacing.md },
  welcomeTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 0.5 },
  welcomeDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22 },
  welcomeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  welcomeBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  welcomeBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: fontSize.sm },
  welcomeBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  welcomeBtnOutlineText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  progressRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progressCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  progressNumber: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl },
  progressLabel: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, marginTop: 2 },
  goalCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1 },
  goalTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.lg, marginBottom: spacing.md },
  goalProgressBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalProgressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 3, minWidth: 2 },
  goalProgressText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  taskText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, flex: 1 },
  taskDone: { textDecorationLine: 'line-through' },
  reminderCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  reminderTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  reminderInterval: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.xs },
  quickLabel: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs },
});
