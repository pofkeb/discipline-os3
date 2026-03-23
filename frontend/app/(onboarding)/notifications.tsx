import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { completeOnboarding } from '../../src/services/localStore';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const handleEnable = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Progress dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '12' }]}>
            <Ionicons name="notifications" size={48} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>STAY ON TRACK</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Get reminders to complete your tasks, motivational quotes to keep you going, and milestone celebrations.
          </Text>

          <View style={styles.benefitList}>
            {[
              { icon: 'time-outline', text: 'Task reminders at the right time' },
              { icon: 'flame-outline', text: 'Streak alerts to keep momentum' },
              { icon: 'chatbubble-outline', text: 'Daily motivational quotes' },
            ].map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Ionicons name={b.icon as any} size={20} color={colors.accent} />
                <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            testID="enable-notifications-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleEnable}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={styles.buttonText}>ENABLE NOTIFICATIONS</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="skip-notifications-btn" style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1 },
  desc: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.md, lineHeight: 24, paddingHorizontal: spacing.sm },
  benefitList: { gap: spacing.md, marginTop: spacing.xl, alignSelf: 'stretch', paddingHorizontal: spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  bottom: { paddingBottom: spacing.xl, gap: spacing.md },
  button: { height: 56, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
});
