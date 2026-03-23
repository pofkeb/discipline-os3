import * as localStore from './localStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  get isLocal(): boolean {
    return !this.token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${BACKEND_URL}/api${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  }

  // Auth (always remote)
  register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Goals
  getGoals() {
    if (this.isLocal) return localStore.getGoals();
    return this.request('/goals');
  }

  createGoal(title: string, description: string, target_date?: string) {
    if (this.isLocal) return localStore.createGoal(title, description, target_date);
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify({ title, description, target_date }),
    });
  }

  getGoal(id: string) {
    if (this.isLocal) return localStore.getGoal(id);
    return this.request(`/goals/${id}`);
  }

  updateGoal(id: string, title: string, description: string, target_date?: string) {
    if (this.isLocal) return localStore.updateGoal(id, title, description, target_date);
    return this.request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, target_date }),
    });
  }

  deleteGoal(id: string) {
    if (this.isLocal) return localStore.deleteGoal(id);
    return this.request(`/goals/${id}`, { method: 'DELETE' });
  }

  addMilestone(goalId: string, title: string) {
    if (this.isLocal) return localStore.addMilestone(goalId, title);
    return this.request(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  toggleMilestone(goalId: string, milestoneId: string) {
    if (this.isLocal) return localStore.toggleMilestone(goalId, milestoneId);
    return this.request(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'PUT' });
  }

  deleteMilestone(goalId: string, milestoneId: string) {
    if (this.isLocal) return localStore.deleteMilestone(goalId, milestoneId);
    return this.request(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' });
  }

  // Tasks
  getTasks() {
    if (this.isLocal) return localStore.getTasks();
    return this.request('/tasks');
  }

  createTask(title: string) {
    if (this.isLocal) return localStore.createTask(title);
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  deleteTask(id: string) {
    if (this.isLocal) return localStore.deleteTask(id);
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  toggleTask(id: string) {
    if (this.isLocal) return localStore.toggleTask(id);
    return this.request(`/tasks/${id}/toggle`, { method: 'POST' });
  }

  // Reminders
  getReminders() {
    if (this.isLocal) return localStore.getReminders();
    return this.request('/reminders');
  }

  createReminder(title: string, interval_type: string, interval_value: number, specific_time?: string) {
    if (this.isLocal) return localStore.createReminder(title, interval_type, interval_value, specific_time);
    return this.request('/reminders', {
      method: 'POST',
      body: JSON.stringify({ title, interval_type, interval_value, specific_time }),
    });
  }

  deleteReminder(id: string) {
    if (this.isLocal) return localStore.deleteReminder(id);
    return this.request(`/reminders/${id}`, { method: 'DELETE' });
  }

  // Stats
  getStats() {
    if (this.isLocal) return localStore.getStats();
    return this.request('/stats');
  }

  // Quotes
  getDailyQuote() {
    if (this.isLocal) return Promise.resolve(localStore.getDailyQuote());
    return this.request('/quotes/daily');
  }
}

export const api = new ApiService();
