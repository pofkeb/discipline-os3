import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../src/constants/theme';
import { useSubscription, getLimits } from '../src/contexts/SubscriptionContext';
import { api } from '../src/services/api';
import * as Haptics from 'expo-haptics';

export default function CreateTaskScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { plan } = useSubscription();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    const tasks = await api.getTasks();
    const limits = getLimits(plan);
    if (tasks.length >= limits.maxTasks) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    setLoading(true);
    try {
      await api.createTask(title.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity testID="close-create-task-btn" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>NEW TASK</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>TASK TITLE</Text>
          <TextInput
            testID="task-title-input"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. Read for 30 minutes"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />

          <TouchableOpacity
            testID="save-task-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ADD TASK</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xl, letterSpacing: 1 },
  form: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  label: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginTop: spacing.sm },
  input: { height: 56, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  button: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
});
