import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

type Task = { id: string; title: string; is_completed_today: boolean };
type Reminder = { id: string; title: string; interval_type: string; interval_value: number; is_active: boolean };

export default function TasksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders'>('tasks');

  const loadData = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([api.getTasks(), api.getReminders()]);
      setTasks(t);
      setReminders(r);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleTask = async (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await api.toggleTask(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: res.is_completed } : t));
  };

  const deleteTask = (id: string) => {
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      }},
    ]);
  };

  const deleteReminder = (id: string) => {
    Alert.alert('Delete Reminder', 'Remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteReminder(id);
        setReminders(prev => prev.filter(r => r.id !== id));
      }},
    ]);
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      testID={`task-row-${item.id}`}
      style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleTask(item.id)}
      onLongPress={() => deleteTask(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.is_completed_today && { backgroundColor: colors.accent, borderColor: colors.accent }, !item.is_completed_today && { borderColor: colors.textTertiary }]}>
        {item.is_completed_today && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[styles.taskText, { color: item.is_completed_today ? colors.textTertiary : colors.textPrimary }, item.is_completed_today && styles.taskDone]}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderReminder = ({ item }: { item: Reminder }) => (
    <TouchableOpacity
      testID={`reminder-row-${item.id}`}
      style={[styles.reminderItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onLongPress={() => deleteReminder(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.reminderIcon, { backgroundColor: colors.accent + '15' }]}>
        <Ionicons name="notifications" size={18} color={colors.accent} />
      </View>
      <View style={styles.reminderInfo}>
        <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.reminderSub, { color: colors.textSecondary }]}>
          Every {item.interval_value} {item.interval_type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {activeTab === 'tasks' ? 'TASKS' : 'REMINDERS'}
        </Text>
        <TouchableOpacity testID="add-item-btn" onPress={() => router.push(activeTab === 'tasks' ? '/create-task' : '/create-reminder')}>
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          testID="tasks-tab-btn"
          style={[styles.tab, activeTab === 'tasks' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tasks' ? '#fff' : colors.textSecondary }]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="reminders-tab-btn"
          style={[styles.tab, activeTab === 'reminders' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('reminders')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'reminders' ? '#fff' : colors.textSecondary }]}>Reminders</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : activeTab === 'tasks' ? (
        tasks.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="checkbox-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks yet</Text>
          </View>
        ) : (
          <FlatList data={tasks} keyExtractor={i => i.id} renderItem={renderTask} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
        )
      ) : (
        reminders.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders yet</Text>
          </View>
        ) : (
          <FlatList data={reminders} keyExtractor={i => i.id} renderItem={renderReminder} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xxxl, letterSpacing: 1 },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  taskText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.base, flex: 1 },
  taskDone: { textDecorationLine: 'line-through' },
  reminderItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontFamily: 'Inter_500Medium', fontSize: fontSize.base },
  reminderSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: 2 },
});
