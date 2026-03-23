import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Milestone = { id: string; title: string; is_completed: boolean; completed_at: string | null };
type Goal = { id: string; title: string; description: string; milestones: Milestone[]; is_active: boolean; target_date?: string };

export default function GoalDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMilestone, setNewMilestone] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  useEffect(() => {
    if (id) loadGoal();
  }, [id]);

  const loadGoal = async () => {
    try {
      const data = await api.getGoal(id!);
      setGoal(data);
    } catch {
      Alert.alert('Error', 'Goal not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await api.toggleMilestone(id!, milestoneId);
      setGoal(updated);
    } catch {}
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    try {
      const updated = await api.addMilestone(id!, newMilestone.trim());
      setGoal(updated);
      setNewMilestone('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {} finally {
      setAddingMilestone(false);
    }
  };

  const deleteMilestone = (milestoneId: string) => {
    Alert.alert('Delete Milestone', 'Remove this milestone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = await api.deleteMilestone(id!, milestoneId);
        setGoal(updated);
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!goal) return null;

  const done = goal.milestones.filter(m => m.is_completed).length;
  const total = goal.milestones.length;
  const progress = total > 0 ? done / total : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity testID="back-from-goal-btn" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>GOAL</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{goal.title}</Text>
          {goal.description ? (
            <Text style={[styles.goalDesc, { color: colors.textSecondary }]}>{goal.description}</Text>
          ) : null}

          {/* Progress */}
          <View testID="goal-progress-section" style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>PROGRESS</Text>
              <Text style={[styles.progressPercent, { color: colors.accent }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.progressDetail, { color: colors.textTertiary }]}>{done} of {total} milestones completed</Text>
          </View>

          {/* Milestones */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ROADMAP</Text>
            {goal.milestones.map((m, i) => (
              <TouchableOpacity
                key={m.id}
                testID={`milestone-${m.id}`}
                style={[styles.milestoneItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => toggleMilestone(m.id)}
                onLongPress={() => deleteMilestone(m.id)}
                activeOpacity={0.7}
              >
                <View style={styles.milestoneLeft}>
                  <View style={[styles.milestoneNum, { backgroundColor: m.is_completed ? colors.accent : colors.surfaceHighlight }]}>
                    {m.is_completed ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={[styles.numText, { color: colors.textSecondary }]}>{i + 1}</Text>
                    )}
                  </View>
                  {i < goal.milestones.length - 1 && (
                    <View style={[styles.milestoneConnector, { backgroundColor: goal.milestones[i + 1]?.is_completed || m.is_completed ? colors.accent : colors.border }]} />
                  )}
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneTitle, { color: m.is_completed ? colors.textTertiary : colors.textPrimary }, m.is_completed && styles.milestoneDone]}>{m.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Milestone */}
          <View style={[styles.addRow, { borderColor: colors.border }]}>
            <TextInput
              testID="new-milestone-input"
              style={[styles.addInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Add a milestone..."
              placeholderTextColor={colors.textTertiary}
              value={newMilestone}
              onChangeText={setNewMilestone}
              onSubmitEditing={addMilestone}
              returnKeyType="done"
            />
            <TouchableOpacity
              testID="add-milestone-btn"
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              onPress={addMilestone}
              disabled={addingMilestone}
            >
              {addingMilestone ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={24} color="#fff" />}
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.sm, letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  goalTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 0.5, marginBottom: spacing.xs },
  goalDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, lineHeight: 24, marginBottom: spacing.lg },
  progressCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1 },
  progressPercent: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', borderRadius: 4, minWidth: 2 },
  progressDetail: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1, marginBottom: spacing.md },
  milestoneItem: { flexDirection: 'row', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  milestoneLeft: { alignItems: 'center', marginRight: spacing.md },
  milestoneNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  numText: { fontFamily: 'Inter_700Bold', fontSize: fontSize.xs },
  milestoneConnector: { width: 2, flex: 1, marginTop: 4 },
  milestoneContent: { flex: 1, justifyContent: 'center' },
  milestoneTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  milestoneDone: { textDecorationLine: 'line-through' },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  addInput: { flex: 1, height: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  addBtn: { width: 48, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
});
