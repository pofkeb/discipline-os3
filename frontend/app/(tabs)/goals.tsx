import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Milestone = { id: string; title: string; is_completed: boolean };
type Goal = { id: string; title: string; description: string; milestones: Milestone[]; is_active: boolean };

export default function GoalsScreen() {
  const colors = useThemeColors();
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
    const done = item.milestones.filter(m => m.is_completed).length;
    const total = item.milestones.length;
    const progress = total > 0 ? done / total : 0;

    return (
      <TouchableOpacity
        testID={`goal-card-${item.id}`}
        style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/goal/${item.id}`)}
        onLongPress={() => deleteGoal(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.goalTop}>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            {item.description ? <Text style={[styles.goalDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
        {total > 0 && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{done}/{total} milestones</Text>
          </View>
        )}
        {total === 0 && (
          <Text style={[styles.noMilestones, { color: colors.textTertiary }]}>Tap to add milestones</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>GOALS</Text>
        <TouchableOpacity testID="add-goal-btn" onPress={() => router.push('/create-goal')}>
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '12' }]}>
            <Ionicons name="trophy" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Set your first goal</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Break it into milestones and track your progress toward something meaningful.</Text>
          <TouchableOpacity testID="create-first-goal-btn" style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/create-goal')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>CREATE GOAL</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={goals} keyExtractor={item => item.id} renderItem={renderGoal} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxl, letterSpacing: 0.5, marginBottom: spacing.sm },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.base, letterSpacing: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  goalCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalInfo: { flex: 1 },
  goalTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.lg },
  goalDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  noMilestones: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: spacing.sm, fontStyle: 'italic' },
  progressSection: { marginTop: spacing.md },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', borderRadius: 3, minWidth: 2 },
  progressText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
});
