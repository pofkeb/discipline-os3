import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Step = {
  id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  order: number;
};

type Milestone = {
  id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  steps: Step[];   // defaults to [] for old milestones via ?? []
};

type Goal = {
  id: string;
  title: string;
  description: string;
  milestones: Milestone[];
  is_active: boolean;
};

export default function GoalDetailScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [goal, setGoal]               = useState<Goal | null>(null);
  const [loading, setLoading]         = useState(true);

  // Milestone add state
  const [newMs, setNewMs]             = useState('');
  const [adding, setAdding]           = useState(false);
  const [showMsInput, setShowMsInput] = useState(false);
  const msInputRef = useRef<TextInput>(null);

  // Step add state — tracks which milestone is currently accepting a new step
  const [addingStepFor, setAddingStepFor] = useState<string | null>(null);
  const [newStep, setNewStep]             = useState('');
  const [savingStep, setSavingStep]       = useState(false);
  const stepInputRef = useRef<TextInput>(null);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try { setGoal(await api.getGoal(id!)); }
    catch { Alert.alert('Error', 'Goal not found'); router.back(); }
    finally { setLoading(false); }
  };

  // ─── Milestone handlers (unchanged behaviour) ───

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
    Alert.alert('Remove milestone?', 'This will also delete all its steps.', [
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

  // ─── Step handlers ───

  const toggleStep = async (milestoneId: string, stepId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoal(await api.toggleStep(id!, milestoneId, stepId));
  };

  const addStep = async (milestoneId: string) => {
    if (!newStep.trim()) { setAddingStepFor(null); return; }
    setSavingStep(true);
    const updated = await api.addStep(id!, milestoneId, newStep.trim());
    setGoal(updated);
    setNewStep('');
    setAddingStepFor(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavingStep(false);
  };

  const deleteStep = (milestoneId: string, stepId: string) => {
    Alert.alert('Remove step?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => setGoal(await api.deleteStep(id!, milestoneId, stepId)) },
    ]);
  };

  const openStepInput = (milestoneId: string) => {
    setAddingStepFor(milestoneId);
    setNewStep('');
    setTimeout(() => stepInputRef.current?.focus(), 80);
  };

  // ─── Derived progress ───

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View>
    </SafeAreaView>
  );
  if (!goal) return null;

  // Progress counts ALL completable nodes: milestones + their steps
  const allSteps     = goal.milestones.flatMap(m => m.steps ?? []);
  const totalNodes   = goal.milestones.length + allSteps.length;
  const doneMs       = goal.milestones.filter(m => m.is_completed).length;
  const doneSteps    = allSteps.filter(s => s.is_completed).length;
  const doneNodes    = doneMs + doneSteps;
  const pct          = totalNodes > 0 ? doneNodes / totalNodes : 0;
  const isComplete   = totalNodes > 0 && doneNodes === totalNodes;
  const totalStepCount = allSteps.length;

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

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title & description */}
          <Text style={[s.title, { color: c.textPrimary }]}>{goal.title}</Text>
          {goal.description ? <Text style={[s.desc, { color: c.textSecondary }]}>{goal.description}</Text> : null}

          {/* Progress card */}
          <View style={[s.progressCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.progressRow}>
              <View style={[s.ring, { borderColor: c.surfaceHighlight }]}>
                <View style={[s.ringFill, {
                  borderColor: isComplete ? c.success : c.accent,
                  borderTopColor: pct > 0 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight,
                  borderRightColor: pct > 0.25 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight,
                  borderBottomColor: pct > 0.5 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight,
                  borderLeftColor: pct > 0.75 ? (isComplete ? c.success : c.accent) : c.surfaceHighlight,
                }]}>
                  <Text style={[s.ringPct, { color: isComplete ? c.success : c.accent }]}>{Math.round(pct * 100)}%</Text>
                </View>
              </View>
              <View style={s.progressInfo}>
                <Text style={[s.progressBig, { color: c.textPrimary }]}>
                  {doneNodes}<Text style={{ color: c.textTertiary }}>/{totalNodes}</Text>
                </Text>
                <Text style={[s.progressSub, { color: c.textSecondary }]}>
                  {totalStepCount > 0
                    ? `${doneMs}/${goal.milestones.length} milestones · ${doneSteps}/${totalStepCount} steps`
                    : 'milestones completed'}
                </Text>
                {isComplete && <Text style={[s.completeTag, { color: c.success }]}>Goal complete!</Text>}
              </View>
            </View>
            <View style={[s.progBar, { backgroundColor: c.surfaceHighlight }]}>
              <View style={[s.progFill, { backgroundColor: isComplete ? c.success : c.accent, width: `${pct * 100}%` }]} />
            </View>
          </View>

          {/* Roadmap header */}
          <View style={s.roadmapHeader}>
            <Text style={[s.roadmapTitle, { color: c.textPrimary }]}>ROADMAP</Text>
            <Text style={[s.roadmapCount, { color: c.textTertiary }]}>
              {goal.milestones.length} milestones{totalStepCount > 0 ? ` · ${totalStepCount} steps` : ''}
            </Text>
          </View>

          {goal.milestones.length === 0 && (
            <View style={[s.emptyMs, { borderColor: c.border }]}>
              <Ionicons name="flag-outline" size={28} color={c.textTertiary} />
              <Text style={[s.emptyMsTxt, { color: c.textSecondary }]}>Break this goal into milestones</Text>
            </View>
          )}

          {/* Milestone list */}
          {goal.milestones.map((m, i) => {
            const isLast = i === goal.milestones.length - 1;
            const steps  = m.steps ?? [];
            const isAddingHere = addingStepFor === m.id;

            return (
              <View key={m.id} style={s.msRow}>
                {/* Timeline column */}
                <View style={s.msTimeline}>
                  <TouchableOpacity
                    testID={`milestone-dot-${m.id}`}
                    onPress={() => toggleMs(m.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View style={[s.msDot, m.is_completed
                      ? { backgroundColor: c.accent }
                      : { backgroundColor: c.background, borderWidth: 2, borderColor: c.border }
                    ]}>
                      {m.is_completed && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                  {!isLast && (
                    <View style={[s.msLine, {
                      backgroundColor: goal.milestones[i + 1]?.is_completed || m.is_completed ? c.accent : c.border,
                    }]} />
                  )}
                </View>

                {/* Milestone card + inline steps */}
                <View style={[s.msCardWrap, { marginLeft: spacing.sm, marginBottom: spacing.sm }]}>
                  {/* Milestone header row */}
                  <TouchableOpacity
                    testID={`milestone-${m.id}`}
                    style={[s.msCard, { backgroundColor: c.surface, borderColor: m.is_completed ? c.accent + '40' : c.border }]}
                    onPress={() => toggleMs(m.id)}
                    onLongPress={() => deleteMs(m.id)}
                    activeOpacity={0.6}
                  >
                    <View style={s.msContent}>
                      <Text style={[s.msNum, { color: c.textTertiary }]}>#{i + 1}</Text>
                      <Text style={[s.msTxt, { color: m.is_completed ? c.textTertiary : c.textPrimary }, m.is_completed && s.msDone]}>
                        {m.title}
                      </Text>
                    </View>
                    {m.is_completed && <Ionicons name="checkmark-circle" size={20} color={c.accent} />}
                  </TouchableOpacity>

                  {/* Steps section — rendered inline below the milestone card */}
                  {(steps.length > 0 || isAddingHere) && (
                    <View style={[s.stepsContainer, { borderColor: c.border }]}>
                      {steps.map((step, si) => (
                        <TouchableOpacity
                          key={step.id}
                          testID={`step-${step.id}`}
                          style={[s.stepRow, si < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border + '60' }]}
                          onPress={() => toggleStep(m.id, step.id)}
                          onLongPress={() => deleteStep(m.id, step.id)}
                          activeOpacity={0.6}
                        >
                          <View style={[s.stepDot, step.is_completed
                            ? { backgroundColor: c.success, borderColor: c.success }
                            : { borderColor: c.textTertiary, backgroundColor: 'transparent' }
                          ]}>
                            {step.is_completed && <Ionicons name="checkmark" size={9} color="#fff" />}
                          </View>
                          <Text style={[
                            s.stepTxt,
                            { color: step.is_completed ? c.textTertiary : c.textPrimary },
                            step.is_completed && s.stepDone,
                          ]}>
                            {step.title}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {/* Inline step input */}
                      {isAddingHere && (
                        <View style={[s.stepAddRow, steps.length > 0 && { borderTopWidth: 1, borderTopColor: c.border + '60' }]}>
                          <TextInput
                            ref={stepInputRef}
                            testID={`add-step-input-${m.id}`}
                            style={[s.stepAddInput, { color: c.textPrimary }]}
                            placeholder="Step title..."
                            placeholderTextColor={c.textTertiary}
                            value={newStep}
                            onChangeText={setNewStep}
                            onSubmitEditing={() => addStep(m.id)}
                            returnKeyType="done"
                            autoFocus
                          />
                          <TouchableOpacity
                            testID={`save-step-${m.id}`}
                            style={[s.stepSaveBtn, { backgroundColor: c.accent }]}
                            onPress={() => addStep(m.id)}
                            disabled={savingStep}
                          >
                            {savingStep
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Ionicons name="checkmark" size={16} color="#fff" />
                            }
                          </TouchableOpacity>
                          <TouchableOpacity style={s.stepCancelBtn} onPress={() => { setAddingStepFor(null); setNewStep(''); }}>
                            <Ionicons name="close" size={16} color={c.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Add step button — shown when not already adding a step here */}
                  {!isAddingHere && (
                    <TouchableOpacity
                      testID={`show-add-step-${m.id}`}
                      style={[s.addStepBtn, { borderColor: c.border + '80' }]}
                      onPress={() => openStepInput(m.id)}
                    >
                      <Ionicons name="add" size={14} color={c.textTertiary} />
                      <Text style={[s.addStepTxt, { color: c.textTertiary }]}>Add step</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* Add milestone */}
          {showMsInput ? (
            <View style={s.addRow}>
              <TextInput
                ref={msInputRef}
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
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowMsInput(false); setNewMs(''); }}>
                <Ionicons name="close" size={22} color={c.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              testID="show-add-milestone-btn"
              style={[s.addMsBtn, { borderColor: c.border }]}
              onPress={() => { setShowMsInput(true); setTimeout(() => msInputRef.current?.focus(), 100); }}
            >
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
  safe:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg },

  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 32, letterSpacing: 0.5, marginBottom: 4 },
  desc:  { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, lineHeight: 22, marginBottom: spacing.lg },

  // Progress card (unchanged)
  progressCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md, marginBottom: spacing.xl },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  ring:         { width: 72, height: 72, borderRadius: 36, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  ringFill:     { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  ringPct:      { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20 },
  progressInfo: { flex: 1 },
  progressBig:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 32 },
  progressSub:  { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: -2 },
  completeTag:  { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 4 },
  progBar:      { height: 4, borderRadius: 2, overflow: 'hidden' },
  progFill:     { height: '100%', borderRadius: 2, minWidth: 1 },

  // Roadmap header (unchanged)
  roadmapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  roadmapTitle:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 16, letterSpacing: 1 },
  roadmapCount:  { fontFamily: 'Inter_400Regular', fontSize: 12 },

  // Empty milestone state (unchanged)
  emptyMs:    { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  emptyMsTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },

  // Milestone row
  msRow:      { flexDirection: 'row', marginBottom: 0 },
  msTimeline: { width: 24, alignItems: 'center', paddingTop: 14 },
  msDot:      { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  msLine:     { width: 2, flex: 1, marginTop: -2, marginBottom: -2 },
  msCardWrap: { flex: 1 },
  msCard:     { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  msContent:  { flex: 1 },
  msNum:      { fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 2 },
  msTxt:      { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  msDone:     { textDecorationLine: 'line-through' },

  // Steps block — rendered directly below the milestone card
  stepsContainer: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, overflow: 'hidden' },

  stepRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.md, gap: spacing.sm },
  stepDot:  { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepTxt:  { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  stepDone: { textDecorationLine: 'line-through' },

  // Inline step input row
  stepAddRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6, gap: spacing.xs },
  stepAddInput:  { flex: 1, height: 36, fontFamily: 'Inter_400Regular', fontSize: 13, paddingHorizontal: spacing.sm },
  stepSaveBtn:   { width: 32, height: 32, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  stepCancelBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  // Add step button (subtle, sits below the steps block)
  addStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: spacing.md, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  addStepTxt: { fontFamily: 'Inter_400Regular', fontSize: 12 },

  // Add milestone input row (unchanged)
  addRow:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingLeft: 36 },
  addInput: { flex: 1, height: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.sm, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  addBtn:   { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  cancelBtn:{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  addMsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 14, paddingLeft: 36, borderTopWidth: 1 },
  addMsTxt: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
});
