import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Milestone = { id: string; title: string; is_completed: boolean; completed_at: string | null };
type Goal = { id: string; title: string; description: string; milestones: Milestone[]; is_active: boolean };

export default function GoalDetailScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMs, setNewMs] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try { setGoal(await api.getGoal(id!)); }
    catch { Alert.alert('Error', 'Goal not found'); router.back(); }
    finally { setLoading(false); }
  };

  const toggleMs = async (mid: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGoal(await api.toggleMilestone(id!, mid));
  };

  const addMs = async () => {
    if (!newMs.trim()) return;
    setAdding(true);
    const updated = await api.addMilestone(id!, newMs.trim());
    setGoal(updated);
    setNewMs('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdding(false);
  };

  const deleteMs = (mid: string) => {
    Alert.alert('Remove milestone?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => setGoal(await api.deleteMilestone(id!, mid)) },
    ]);
  };

  const deleteGoal = () => {
    Alert.alert('Delete this goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteGoal(id!); router.back(); } },
    ]);
  };

  if (loading) return <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}><View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View></SafeAreaView>;
  if (!goal) return null;

  const done = goal.milestones.filter(m => m.is_completed).length;
  const total = goal.milestones.length;
  const pct = total > 0 ? done / total : 0;
  const isComplete = total > 0 && done === total;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity testID="back-from-goal-btn" onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteGoal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={20} color={c.textTertiary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Title & description */}
          <Text style={[s.title, { color: c.textPrimary }]}>{goal.title}</Text>
          {goal.description ? <Text style={[s.desc, { color: c.textSecondary }]}>{goal.description}</Text> : null}

          {/* Progress ring area */}
          <View style={[s.progressCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.progressRow}>
              <View style={[s.ring, { borderColor: c.surfaceHighlight }]}>
                <View style={[s.ringFill, { borderColor: isComplete ? c.success : c.accent, borderTopColor: pct > 0 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight, borderRightColor: pct > 0.25 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight, borderBottomColor: pct > 0.5 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight, borderLeftColor: pct > 0.75 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight }]}>
                  <Text style={[s.ringPct, { color: isComplete ? c.success : c.accent }]}>{Math.round(pct * 100)}%</Text>
                </View>
              </View>
              <View style={s.progressInfo}>
                <Text style={[s.progressBig, { color: c.textPrimary }]}>{done}<Text style={{ color: c.textTertiary }}>/{total}</Text></Text>
                <Text style={[s.progressSub, { color: c.textSecondary }]}>milestones completed</Text>
                {isComplete && <Text style={[s.completeTag, { color: c.success }]}>Goal complete!</Text>}
              </View>
            </View>
            <View style={[s.progBar, { backgroundColor: c.surfaceHighlight }]}>
              <View style={[s.progFill, { backgroundColor: isComplete ? c.success : c.accent, width: `${pct * 100}%` }]} />
            </View>
          </View>

          {/* Roadmap */}
          <View style={s.roadmapHeader}>
            <Text style={[s.roadmapTitle, { color: c.textPrimary }]}>ROADMAP</Text>
            <Text style={[s.roadmapCount, { color: c.textTertiary }]}>{total} milestones</Text>
          </View>

          {goal.milestones.length === 0 && (
            <View style={[s.emptyMs, { borderColor: c.border }]}>
              <Ionicons name="flag-outline" size={28} color={c.textTertiary} />
              <Text style={[s.emptyMsTxt, { color: c.textSecondary }]}>Break this goal into milestones</Text>
            </View>
          )}

          {goal.milestones.map((m, i) => {
            const isLast = i === goal.milestones.length - 1;
            return (
              <View key={m.id} style={s.msRow}>
                {/* Timeline */}
                <View style={s.msTimeline}>
                  <View style={[s.msDot, m.is_completed ? { backgroundColor: c.accent } : { backgroundColor: c.background, borderWidth: 2, borderColor: c.border }]}>
                    {m.is_completed && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  {!isLast && <View style={[s.msLine, { backgroundColor: goal.milestones[i + 1]?.is_completed || m.is_completed ? c.accent : c.border }]} />}
                </View>
                {/* Content */}
                <TouchableOpacity
                  testID={`milestone-${m.id}`}
                  style={[s.msCard, { backgroundColor: c.surface, borderColor: m.is_completed ? c.accent + '40' : c.border }]}
                  onPress={() => toggleMs(m.id)}
                  onLongPress={() => deleteMs(m.id)}
                  activeOpacity={0.6}
                >
                  <View style={s.msContent}>
                    <Text style={[s.msNum, { color: c.textTertiary }]}>#{i + 1}</Text>
                    <Text style={[s.msTxt, { color: m.is_completed ? c.textTertiary : c.textPrimary }, m.is_completed && s.msDone]}>{m.title}</Text>
                  </View>
                  {m.is_completed && <Ionicons name="checkmark-circle" size={20} color={c.accent} />}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add milestone */}
          {showInput ? (
            <View style={s.addRow}>
              <TextInput
                ref={inputRef}
                testID="new-milestone-input"
                style={[s.addInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                placeholder="Milestone title..."
                placeholderTextColor={c.textTertiary}
                value={newMs}
                onChangeText={setNewMs}
                onSubmitEditing={addMs}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity testID="add-milestone-btn" style={[s.addBtn, { backgroundColor: c.accent }]} onPress={addMs} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={22} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowInput(false); setNewMs(''); }}>
                <Ionicons name="close" size={22} color={c.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity testID="show-add-milestone-btn" style={[s.addMsBtn, { borderColor: c.border }]}
              onPress={() => { setShowInput(true); setTimeout(() => inputRef.current?.focus(), 100); }}>
              <Ionicons name="add" size={20} color={c.accent} />
              <Text style={[s.addMsTxt, { color: c.accent }]}>Add milestone</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 32, letterSpacing: 0.5, marginBottom: 4 },
  desc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, lineHeight: 22, marginBottom: spacing.lg },

  progressCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md, marginBottom: spacing.xl },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  ringFill: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  ringPct: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20 },
  progressInfo: { flex: 1 },
  progressBig: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 32 },
  progressSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: -2 },
  completeTag: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 4 },
  progBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 2, minWidth: 1 },

  roadmapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  roadmapTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 16, letterSpacing: 1 },
  roadmapCount: { fontFamily: 'Inter_400Regular', fontSize: 12 },

  emptyMs: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  emptyMsTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

  msRow: { flexDirection: 'row', marginBottom: 0 },
  msTimeline: { width: 24, alignItems: 'center', paddingTop: 2 },
  msDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  msLine: { width: 2, flex: 1, marginTop: -2, marginBottom: -2 },
  msCard: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  msContent: { flex: 1 },
  msNum: { fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 2 },
  msTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  msDone: { textDecorationLine: 'line-through' },

  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingLeft: 36 },
  addInput: { flex: 1, height: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.sm, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  addBtn: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  addMsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 14, paddingLeft: 36, borderTopWidth: 1 },
  addMsTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
});
