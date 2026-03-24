import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  goals: '@dos/goals',
  tasks: '@dos/tasks',
  completions: '@dos/completions',
  reminders: '@dos/reminders',
  onboarding: '@dos/onboarding_complete',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function getItem<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

async function setItem(key: string, value: any) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ─── Onboarding ───

export async function isOnboardingComplete(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboarding)) === 'true';
}

export async function completeOnboarding() {
  await AsyncStorage.setItem(KEYS.onboarding, 'true');
}

// ─── Goals ───

export async function getGoals(): Promise<any[]> {
  return getItem(KEYS.goals, []);
}

export async function createGoal(title: string, description: string, target_date?: string) {
  const goals = await getGoals();
  const goal = {
    id: generateId(),
    title,
    description: description || '',
    target_date: target_date || null,
    is_active: true,
    milestones: [],
    created_at: new Date().toISOString(),
  };
  goals.unshift(goal);
  await setItem(KEYS.goals, goals);
  return goal;
}

export async function getGoal(id: string) {
  const goals = await getGoals();
  const goal = goals.find((g: any) => g.id === id);
  if (!goal) throw new Error('Goal not found');
  return goal;
}

export async function updateGoal(id: string, title: string, description: string, target_date?: string) {
  const goals = await getGoals();
  const idx = goals.findIndex((g: any) => g.id === id);
  if (idx === -1) throw new Error('Goal not found');
  goals[idx] = { ...goals[idx], title, description, target_date };
  await setItem(KEYS.goals, goals);
  return goals[idx];
}

export async function deleteGoal(id: string) {
  const goals = await getGoals();
  await setItem(KEYS.goals, goals.filter((g: any) => g.id !== id));
  return { success: true };
}

export async function addMilestone(goalId: string, title: string) {
  const goals = await getGoals();
  const goal = goals.find((g: any) => g.id === goalId);
  if (!goal) throw new Error('Goal not found');
  goal.milestones.push({
    id: generateId(),
    title,
    is_completed: false,
    completed_at: null,
    order: goal.milestones.length,
  });
  await setItem(KEYS.goals, goals);
  return { ...goal };
}

export async function toggleMilestone(goalId: string, milestoneId: string) {
  const goals = await getGoals();
  const goal = goals.find((g: any) => g.id === goalId);
  if (!goal) throw new Error('Goal not found');
  const m = goal.milestones.find((m: any) => m.id === milestoneId);
  if (m) {
    m.is_completed = !m.is_completed;
    m.completed_at = m.is_completed ? new Date().toISOString() : null;
  }
  await setItem(KEYS.goals, goals);
  return { ...goal };
}

export async function deleteMilestone(goalId: string, milestoneId: string) {
  const goals = await getGoals();
  const goal = goals.find((g: any) => g.id === goalId);
  if (!goal) throw new Error('Goal not found');
  goal.milestones = goal.milestones.filter((m: any) => m.id !== milestoneId);
  await setItem(KEYS.goals, goals);
  return { ...goal };
}

// ─── Tasks ───

export async function getTasks(): Promise<any[]> {
  const tasks = await getItem(KEYS.tasks, []);
  const completions = await getItem<Record<string, string[]>>(KEYS.completions, {});
  const today = todayStr();
  const todayDone = completions[today] || [];

  return tasks.map((t: any) => {
    const type: 'routine' | 'one_time' = t.type ?? 'routine';

    if (type === 'one_time') {
      // Scan every date in completion history for this task's ID.
      // Track the latest date so completed_date is always accurate.
      let completed_date: string | null = null;
      for (const [date, ids] of Object.entries(completions)) {
        if ((ids as string[]).includes(t.id)) {
          if (!completed_date || date > completed_date) {
            completed_date = date;
          }
        }
      }
      return {
        ...t,
        type,
        is_completed_today: false,   // not meaningful for one-time tasks
        is_completed: completed_date !== null,
        completed_date,
      };
    }

    // routine — daily-reset via today's slice
    return {
      ...t,
      type: 'routine' as const,
      is_completed_today: todayDone.includes(t.id),
      is_completed: false,
      completed_date: null,
    };
  });
}

export async function createTask(title: string, type: 'non_negotiable' | 'negotiable' | 'one_time' = 'non_negotiable', due_date: string | null = null) {
  const tasks = await getItem<any[]>(KEYS.tasks, []);
  const task = {
    id: generateId(),
    title,
    type,
    due_date,
    created_at: new Date().toISOString(),
  };
  tasks.unshift(task);
  await setItem(KEYS.tasks, tasks);
  return { ...task, is_completed_today: false };
}

export async function deleteTask(id: string) {
  const tasks = await getItem(KEYS.tasks, []);
  await setItem(KEYS.tasks, tasks.filter((t: any) => t.id !== id));
  return { success: true };
}

export async function toggleTask(id: string) {
  // Look up task type first to determine toggle semantics
  const tasks = await getItem<any[]>(KEYS.tasks, []);
  const task = tasks.find((t: any) => t.id === id);
  const type: 'routine' | 'one_time' = task?.type ?? 'routine';

  const completions = await getItem<Record<string, string[]>>(KEYS.completions, {});
  const today = todayStr();
  const todayDone = completions[today] || [];

  if (type === 'one_time') {
    // Find which date (if any) this task was completed on
    let completedOnDate: string | null = null;
    for (const [date, ids] of Object.entries(completions)) {
      if ((ids as string[]).includes(id)) {
        completedOnDate = date;
        break;
      }
    }

    if (completedOnDate !== null) {
      // Un-complete: remove from whatever date it was stored under
      completions[completedOnDate] = (completions[completedOnDate] as string[]).filter((tid: string) => tid !== id);
      if ((completions[completedOnDate] as string[]).length === 0) {
        delete completions[completedOnDate];
      }
      await setItem(KEYS.completions, completions);
      return { is_completed: false, is_completed_today: false, completed_date: null };
    } else {
      // Complete: record under today
      completions[today] = [...todayDone, id];
      await setItem(KEYS.completions, completions);
      return { is_completed: true, is_completed_today: false, completed_date: today };
    }
  }

  // Routine — unchanged daily-reset behaviour
  if (todayDone.includes(id)) {
    completions[today] = todayDone.filter((tid: string) => tid !== id);
    await setItem(KEYS.completions, completions);
    return { is_completed_today: false };
  } else {
    completions[today] = [...todayDone, id];
    await setItem(KEYS.completions, completions);
    return { is_completed_today: true };
  }
}

// ─── Reminders ───

import {
  scheduleReminderNotification,
  cancelReminderNotification,
} from './notifications';

export async function getReminders(): Promise<any[]> {
  return getItem(KEYS.reminders, []);
}

export async function createReminder(title: string, interval_type: string, interval_value: number, specific_time?: string, note?: string) {
  const reminders = await getReminders();
  const reminder = {
    id: generateId(),
    title,
    note: note || '',
    interval_type,
    interval_value,
    specific_time: specific_time || null,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  reminders.unshift(reminder);
  await setItem(KEYS.reminders, reminders);
  
  // Schedule notification for this reminder
  await scheduleReminderNotification(reminder);
  
  return reminder;
}

export async function deleteReminder(id: string) {
  // Cancel notification before deleting
  await cancelReminderNotification(id);
  
  const reminders = await getReminders();
  await setItem(KEYS.reminders, reminders.filter((r: any) => r.id !== id));
  return { success: true };
}

export async function toggleReminderActive(id: string) {
  const reminders = await getReminders();
  const r = reminders.find((r: any) => r.id === id);
  if (!r) throw new Error('Reminder not found');
  r.is_active = !r.is_active;
  await setItem(KEYS.reminders, reminders);
  
  // Schedule or cancel notification based on new state
  if (r.is_active) {
    await scheduleReminderNotification(r);
  } else {
    await cancelReminderNotification(id);
  }
  
  return { is_active: r.is_active };
}

export async function updateReminder(
  id: string,
  title: string,
  interval_type: string,
  interval_value: number,
  specific_time?: string,
  note?: string
) {
  const reminders = await getReminders();
  const idx = reminders.findIndex((r: any) => r.id === id);
  if (idx === -1) throw new Error('Reminder not found');

  const existing = reminders[idx];

  // Cancel any currently scheduled notification for this reminder
  // before writing new data, to avoid duplicates
  await cancelReminderNotification(id);

  reminders[idx] = {
    ...existing,
    title,
    note: note ?? '',
    interval_type,
    interval_value,
    specific_time: specific_time ?? null,
  };

  await setItem(KEYS.reminders, reminders);

  // Only reschedule if the reminder is still active
  if (reminders[idx].is_active) {
    await scheduleReminderNotification(reminders[idx]);
  }

  return reminders[idx];
}

// ─── Stats ───

export async function getStats() {
  const tasks = await getItem(KEYS.tasks, []);
  const completions = await getItem<Record<string, string[]>>(KEYS.completions, {});
  const goals = await getItem(KEYS.goals, []);

  // Streak counts: only non_negotiable tasks (includes old 'routine' tasks via migration shim).
  // Negotiable tasks intentionally do NOT count toward streak.
  const streakIds = new Set<string>(
    tasks
      .filter((t: any) => {
        const type = t.type ?? 'routine';
        return type === 'routine' || type === 'non_negotiable';
      })
      .map((t: any) => t.id as string)
  );

  // Weekly chart counts non-negotiable completions only (same scope as streak)
  const routineIds = streakIds;

  // Streak: consecutive days that have at least one non-negotiable completion
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const hasNonNeg = (completions[ds] || []).some((cid: string) => streakIds.has(cid));
    if (hasNonNeg) { streak++; } else { break; }
  }

  // Total completions: all task types (historical count)
  let totalCompletions = 0;
  Object.values(completions).forEach((arr: any) => { totalCompletions += arr.length; });

  // Today's completions: routine-only (drives the focus card)
  const todayC = (completions[todayStr()] || []).filter((cid: string) => routineIds.has(cid)).length;

  let totalMilestones = 0;
  let completedMilestones = 0;
  goals.forEach((g: any) => {
    (g.milestones || []).forEach((m: any) => {
      totalMilestones++;
      if (m.is_completed) completedMilestones++;
    });
  });

  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const routineCount = (completions[ds] || []).filter((cid: string) => routineIds.has(cid)).length;
    weeklyData.push({ date: ds, count: routineCount });
  }

  return {
    streak,
    total_tasks: tasks.length,
    total_completions: totalCompletions,
    today_completions: todayC,
    total_goals: goals.length,
    total_milestones: totalMilestones,
    completed_milestones: completedMilestones,
    weekly_data: weeklyData,
  };
}

// ─── Quotes ───

const QUOTES = [
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "We do not rise to the level of our goals. We fall to the level of our systems.", author: "James Clear" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It's not about motivation. It's about discipline.", author: "Unknown" },
  { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn" },
  { text: "You will never always be motivated. You have to learn to be disciplined.", author: "Unknown" },
  { text: "The pain of discipline is nothing like the pain of disappointment.", author: "Justin Langer" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "Do what needs to be done, when it needs to be done, whether you feel like it or not.", author: "Unknown" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "First we make our habits, then our habits make us.", author: "Charles C. Noble" },
  { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
  { text: "One percent better every day.", author: "James Clear" },
  { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Jim Rohn" },
  { text: "Your habits will determine your future.", author: "Jack Canfield" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
];

export function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Templates ───

export async function createGoalFromTemplate(template: { title: string; description: string; milestones: string[] }) {
  const goals = await getGoals();
  const goal = {
    id: generateId(),
    title: template.title,
    description: template.description,
    target_date: null,
    is_active: true,
    milestones: template.milestones.map((t, i) => ({
      id: generateId(),
      title: t,
      is_completed: false,
      completed_at: null,
      order: i,
    })),
    created_at: new Date().toISOString(),
  };
  goals.unshift(goal);
  await setItem(KEYS.goals, goals);
  return goal;
}

// Goal templates: long-term outcomes with milestone roadmaps
export const GOAL_TEMPLATES = [
  {
    icon: 'barbell-outline' as const,
    title: '30-Day Fitness',
    description: 'Transform your body with a structured fitness plan',
    milestones: ['Set target goal', 'Create workout schedule', 'Complete first workout', 'Hit one week streak', 'Complete 30 days'],
  },
  {
    icon: 'book-outline' as const,
    title: 'Learn a New Skill',
    description: 'Master something new with deliberate practice',
    milestones: ['Choose your skill', 'Find learning resources', 'Practice 30 min daily', 'Build a mini project', 'Share your progress'],
  },
];

// Daily task templates: create non-negotiable or negotiable routine tasks — NOT goals
export const TASK_TEMPLATES = [
  {
    icon: 'sunny-outline' as const,
    title: 'Morning Routine',
    description: 'Start every day with your non-negotiables',
    tasks: [
      'Wake up early',
      'Meditate 10 minutes',
      'Exercise 30 minutes',
      'Journal & plan the day',
      'Healthy breakfast',
    ],
    type: 'non_negotiable' as const,
  },
];

export async function createTasksFromTemplate(template: typeof TASK_TEMPLATES[0]) {
  const existing = await getItem<any[]>(KEYS.tasks, []);
  const newTasks = template.tasks.map(title => ({
    id: generateId(),
    title,
    type: template.type,
    due_date: null,
    created_at: new Date().toISOString(),
  }));
  // Prepend new tasks so they appear at the top of the list
  await setItem(KEYS.tasks, [...newTasks, ...existing]);
  return newTasks.map(t => ({ ...t, is_completed_today: false, is_completed: false, completed_date: null }));
}
