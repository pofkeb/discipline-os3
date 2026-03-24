import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { completeOnboarding, createGoalFromTemplate, GOAL_TEMPLATES, createTasksFromTemplate, TASK_TEMPLATES } from '../../src/services/localStore';
import * as Haptics from 'expo-haptics';

export default function StartScreen() {
  const c = useThemeColors();
  const router = useRouter();

  const handleCreateGoal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await completeOnboarding();
    router.replace('/(tabs)');
    setTimeout(() => router.push('/create-goal'), 300);
  };

  const handleTemplate = async (template: typeof GOAL_TEMPLATES[0]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createGoalFromTemplate(template);
    // completeOnboarding() is handled by the notifications screen
    router.push('/(onboarding)/notifications');
  };

  const handleDailyTemplate = async (template: typeof TASK_TEMPLATES[0]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createTasksFromTemplate(template);
    // completeOnboarding() is handled by the notifications screen
    router.push('/(onboarding)/notifications');
  };

  const handleExplore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // completeOnboarding() is handled by the notifications screen
    router.push('/(onboarding)/notifications');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress indicator */}
        <View style={s.progressWrap}>
          <View style={[s.progressDot, { backgroundColor: c.accent }]} />
          <View style={[s.progressDot, { backgroundColor: c.accent }]} />
          <View style={[s.progressDot, { backgroundColor: c.border }]} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: c.textPrimary }]}>How do you want{'\n'}to start?</Text>
          <Text style={[s.subtitle, { color: c.textSecondary }]}>Pick one. You can always change later.</Text>
        </View>

        {/* Primary CTA: Create own goal */}
        <TouchableOpacity
          testID="onboarding-create-goal-btn"
          style={[s.primaryCard, { backgroundColor: c.accent }]}
          onPress={handleCreateGoal}
          activeOpacity={0.85}
        >
          <View style={[s.primaryIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="create-outline" size={22} color="#fff" />
          </View>
          <View style={s.primaryContent}>
            <Text style={s.primaryTitle}>Create my first goal</Text>
            <Text style={s.primaryDesc}>Start from scratch with your own goal</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Goal templates section */}
        <Text style={[s.sectionLabel, { color: c.textTertiary }]}>GOAL TEMPLATES</Text>
        <View style={[s.templateGroup, { backgroundColor: c.surface, borderColor: c.border }]}>
          {GOAL_TEMPLATES.map((template, i) => (
            <TouchableOpacity
              key={i}
              testID={`onboarding-template-${i}-btn`}
              style={[
                s.templateRow,
                i < GOAL_TEMPLATES.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}
              onPress={() => handleTemplate(template)}
              activeOpacity={0.6}
            >
              <View style={[s.templateIcon, { backgroundColor: c.accent + '10' }]}>
                <Ionicons name={template.icon as any} size={18} color={c.accent} />
              </View>
              <View style={s.templateContent}>
                <Text style={[s.templateTitle, { color: c.textPrimary }]}>{template.title}</Text>
                <Text style={[s.templateDesc, { color: c.textTertiary }]} numberOfLines={1}>{template.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily routine templates section */}
        <Text style={[s.sectionLabel, { color: c.textTertiary }]}>DAILY ROUTINES</Text>
        <View style={[s.templateGroup, { backgroundColor: c.surface, borderColor: c.border }]}>
          {TASK_TEMPLATES.map((template, i) => (
            <TouchableOpacity
              key={i}
              testID={`onboarding-daily-template-${i}-btn`}
              style={[
                s.templateRow,
                i < TASK_TEMPLATES.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}
              onPress={() => handleDailyTemplate(template)}
              activeOpacity={0.6}
            >
              <View style={[s.templateIcon, { backgroundColor: c.success + '10' }]}>
                <Ionicons name={template.icon as any} size={18} color={c.success} />
              </View>
              <View style={s.templateContent}>
                <Text style={[s.templateTitle, { color: c.textPrimary }]}>{template.title}</Text>
                <Text style={[s.templateDesc, { color: c.textTertiary }]} numberOfLines={1}>{template.description}</Text>
              </View>
              <View style={[s.tasksBadge, { backgroundColor: c.success + '15' }]}>
                <Text style={[s.tasksBadgeText, { color: c.success }]}>Tasks</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip option */}
        <TouchableOpacity testID="onboarding-explore-btn" style={s.skipBtn} onPress={handleExplore}>
          <Text style={[s.skipText, { color: c.textTertiary }]}>Skip and explore the app</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl },

  progressWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: fontSize.xxxl,
    letterSpacing: 0.5,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.sm,
  },

  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryContent: { flex: 1 },
  primaryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.base,
    color: '#fff',
  },
  primaryDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  templateGroup: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateContent: { flex: 1 },
  templateTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.sm,
  },
  templateDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    marginTop: 1,
  },

  tasksBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tasksBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: fontSize.sm,
  },
});
