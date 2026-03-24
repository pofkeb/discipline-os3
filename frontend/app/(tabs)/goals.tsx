import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Step      = { id: string; is_completed: boolean };
type Milestone = { id: string; title: string; is_completed: boolean; steps: Step[] };
type Goal      = { id: string; title: string; description: string; milestones: Milestone[]; is_active: boolean };

export default function GoalsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    try { setGoals(await api.getGoals()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  const deleteGoal = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await api.deleteGoal(id);
        setGoals(prev => prev.filter(g => g.id !== id));
      }},
    ]);
  };

  const renderGoal = ({ item }: { item: Goal }) => {
    const allSteps   = item.milestones.flatMap(m => m.steps ?? []);
    const totalNodes = item.milestones.length + allSteps.length;
    const doneMs     = item.milestones.filter(m => m.is_completed).length;
    const doneSteps  = allSteps.filter(s => s.is_completed).length;
    const doneNodes  = doneMs + doneSteps;
    const progress   = totalNodes > 0 ? doneNodes / totalNodes : 0;
    const isComplete = totalNodes > 0 && doneNodes === totalNodes;

    return (
      <TouchableOpacity
        testID={`goal-card-${item.id}`}
        style={[s.goalCard, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => router.push(`/goal/${item.id}`)}
        onLongPress={() => deleteGoal(item.id)}
        activeOpacity={0.7}
      >
        <View style={s.goalRow}>
          {/* Progress ring */}
          <View style={[s.ring, { borderColor: isComplete ? c.success : c.accent + '30' }]}>
            <View style={[s.ringInner, { backgroundColor: isComplete ? c.success + '15' : c.accent + '08' }]}>
              {totalNodes > 0 ? (
                <Text style={[s.ringPct, { color: isComplete ? c.success : c.accent }]}>{Math.round(progress * 100)}%</Text>
              ) : (
                <Ionicons name="flag-outline" size={16} color={c.textTertiary} />
              )}
            </View>
          </View>

          {/* Content */}
          <View style={s.goalContent}>
            <Text style={[s.goalTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            {totalNodes > 0 ? (
              <Text style={[s.goalMeta, { color: c.textTertiary }]}>
                {item.milestones.length} milestone{item.milestones.length !== 1 ? 's' : ''}{allSteps.length > 0 ? ` · ${allSteps.length} step${allSteps.length !== 1 ? 's' : ''}` : ''}
              </Text>
            ) : (
              <Text style={[s.goalMeta, { color: c.textTertiary }]}>No milestones yet</Text>
            )}
          </View>

          <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
        </View>

        {/* Progress bar */}
        {totalNodes > 0 && (
          <View style={s.progressWrap}>
            <View style={[s.progressBg, { backgroundColor: c.surfaceHighlight }]}>
              <View style={[s.progressFill, { backgroundColor: isComplete ? c.success : c.accent, width: `${progress * 100}%` }]} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.textPrimary }]}>Goals</Text>
          <Text style={[s.subtitle, { color: c.textTertiary }]}>{goals.length} goal{goals.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          testID="add-goal-btn"
          style={[s.addBtn, { backgroundColor: c.accent }]}
          onPress={() => router.push('/create-goal')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : goals.length === 0 ? (
        <View style={s.emptyContainer}>
          <View style={[s.emptyIcon, { backgroundColor: c.accent + '10' }]}>
            <Ionicons name="trophy" size={32} color={c.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: c.textPrimary }]}>Set your first goal</Text>
          <Text style={[s.emptyDesc, { color: c.textSecondary }]}>
            Break it into milestones and{'\n'}track your progress.
          </Text>
          <TouchableOpacity
            testID="create-first-goal-btn"
            style={[s.emptyBtn, { backgroundColor: c.accent }]}
            onPress={() => router.push('/create-goal')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.emptyBtnText}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={item => item.id}
          renderItem={renderGoal}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 1 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xs, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Goal card
  goalCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPct: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.sm },
  goalContent: { flex: 1 },
  goalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.base },
  goalMeta: { fontFamily: 'Inter_500Medium', fontSize: fontSize.xxs, marginTop: 2 },
  progressWrap: { marginTop: spacing.md },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, minWidth: 1 },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.sm,
  },
});
