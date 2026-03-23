import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { completeOnboarding, createGoalFromTemplate, GOAL_TEMPLATES } from '../../src/services/localStore';
import * as Haptics from 'expo-haptics';

export default function StartScreen() {
  const colors = useThemeColors();
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
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleExplore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Progress dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>HOW DO YOU WANT{'\n'}TO START?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Pick one. You can always change later.</Text>

        {/* Option 1: Create own goal */}
        <TouchableOpacity
          testID="onboarding-create-goal-btn"
          style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleCreateGoal}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.accent + '12' }]}>
            <Ionicons name="create-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Create my first goal</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Start from scratch with your own goal</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Templates */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>OR START WITH A TEMPLATE</Text>

        {GOAL_TEMPLATES.map((template, i) => (
          <TouchableOpacity
            key={i}
            testID={`onboarding-template-${i}-btn`}
            style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleTemplate(template)}
            activeOpacity={0.7}
          >
            <View style={[styles.templateIcon, { backgroundColor: colors.accent + '12' }]}>
              <Ionicons name={template.icon as any} size={22} color={colors.accent} />
            </View>
            <View style={styles.templateContent}>
              <Text style={[styles.templateTitle, { color: colors.textPrimary }]}>{template.title}</Text>
              <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={1}>{template.description}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Explore */}
        <TouchableOpacity
          testID="onboarding-explore-btn"
          style={styles.skipBtn}
          onPress={handleExplore}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip and explore the app</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: spacing.lg, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1, marginBottom: spacing.xs },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, marginBottom: spacing.xl },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, gap: spacing.md },
  optionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1 },
  optionTitle: { fontFamily: 'Inter_700Bold', fontSize: fontSize.base },
  optionDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
  sectionLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginBottom: spacing.md },
  templateCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  templateIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  templateContent: { flex: 1 },
  templateTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  templateDesc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.xl },
  skipText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm, textDecorationLine: 'underline' },
});
