import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { incrementPaywallHits } from '../src/config/revenuecat';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

export default function CreateGoalScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    const goals = await api.getGoals();
    const limits = getLimits(plan);
    if (goals.length >= limits.maxGoals) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const hits = await incrementPaywallHits();
      router.push({ pathname: '/paywall', params: { reason: 'goal_limit', hits: String(hits) } } as any);
      return;
    }
    setLoading(true);
    try {
      await api.createGoal(title.trim(), description.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity testID="close-create-goal-btn" onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.textPrimary }]}>New Goal</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Form */}
        <View style={s.form}>
          {/* Title */}
          <Text style={[s.label, { color: c.textTertiary }]}>TITLE</Text>
          <TextInput
            testID="goal-title-input"
            style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
            placeholder="What do you want to achieve?"
            placeholderTextColor={c.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Description */}
          <Text style={[s.label, { color: c.textTertiary }]}>DESCRIPTION <Text style={{ fontFamily: 'Inter_400Regular' }}>(optional)</Text></Text>
          <TextInput
            testID="goal-description-input"
            style={[s.textArea, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
            placeholder="Add context or motivation..."
            placeholderTextColor={c.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Tip */}
          <View style={[s.tipCard, { backgroundColor: c.surfaceHighlight }]}>
            <Ionicons name="bulb-outline" size={16} color={c.textTertiary} />
            <Text style={[s.tipText, { color: c.textSecondary }]}>
              After creating your goal, you'll add milestones to break it into actionable steps.
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            testID="save-goal-btn"
            style={[s.button, { backgroundColor: title.trim() ? c.accent : c.border }]}
            onPress={handleCreate}
            disabled={loading || !title.trim()}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trophy-outline" size={18} color="#fff" />
                <Text style={s.buttonText}>CREATE GOAL</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.lg,
    letterSpacing: 1,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  button: {
    height: 52,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.base,
    letterSpacing: 1.5,
  },
});
