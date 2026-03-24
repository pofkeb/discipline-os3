import * as localStore from './localStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Architecture: LOCAL-FIRST
// All data operations go through localStore (AsyncStorage) as source of truth.
// When authenticated, writes are mirrored to backend for future sync/backup.
// Reads ALWAYS come from local. Backend is never required for core functionality.

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  private async backendRequest(path: string, options: RequestInit = {}) {
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

  // Mirror a write to backend (fire-and-forget, never blocks UI)
  private mirrorToBackend(path: string, options: RequestInit = {}) {
    if (!this.isAuthenticated) return;
    this.backendRequest(path, options).catch(() => {});
  }

  // ─── Auth (always remote, the only required backend calls) ───

  register(email: string, password: string, name: string) {
    return this.backendRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  login(email: string, password: string) {
    return this.backendRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.backendRequest('/auth/me');
  }

  // ─── Goals (always local-first) ───

  getGoals() { return localStore.getGoals(); }

  async createGoal(title: string, description: string, target_date?: string) {
    const goal = await localStore.createGoal(title, description, target_date);
    this.mirrorToBackend('/goals', { method: 'POST', body: JSON.stringify({ title, description, target_date }) });
    return goal;
  }

  getGoal(id: string) { return localStore.getGoal(id); }

  async updateGoal(id: string, title: string, description: string, target_date?: string) {
    const goal = await localStore.updateGoal(id, title, description, target_date);
    this.mirrorToBackend(`/goals/${id}`, { method: 'PUT', body: JSON.stringify({ title, description, target_date }) });
    return goal;
  }

  async deleteGoal(id: string) {
    const res = await localStore.deleteGoal(id);
    this.mirrorToBackend(`/goals/${id}`, { method: 'DELETE' });
    return res;
  }

  async addMilestone(goalId: string, title: string) {
    const goal = await localStore.addMilestone(goalId, title);
    this.mirrorToBackend(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify({ title }) });
    return goal;
  }

  async toggleMilestone(goalId: string, milestoneId: string) {
    const goal = await localStore.toggleMilestone(goalId, milestoneId);
    this.mirrorToBackend(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'PUT' });
    return goal;
  }

  async deleteMilestone(goalId: string, milestoneId: string) {
    const goal = await localStore.deleteMilestone(goalId, milestoneId);
    this.mirrorToBackend(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' });
    return goal;
  }

  // ─── Tasks (always local-first) ───

  getTasks() { return localStore.getTasks(); }

  async createTask(title: string) {
    const task = await localStore.createTask(title);
    this.mirrorToBackend('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
    return task;
  }

  async deleteTask(id: string) {
    const res = await localStore.deleteTask(id);
    this.mirrorToBackend(`/tasks/${id}`, { method: 'DELETE' });
    return res;
  }

  async toggleTask(id: string) {
    const res = await localStore.toggleTask(id);
    this.mirrorToBackend(`/tasks/${id}/toggle`, { method: 'POST' });
    return res;
  }

  // ─── Reminders (always local-first) ───

  getReminders() { return localStore.getReminders(); }

  async createReminder(title: string, interval_type: string, interval_value: number, specific_time?: string, note?: string) {
    const rem = await localStore.createReminder(title, interval_type, interval_value, specific_time, note);
    this.mirrorToBackend('/reminders', { method: 'POST', body: JSON.stringify({ title, note: note || '', interval_type, interval_value, specific_time }) });
    return rem;
  }

  async deleteReminder(id: string) {
    const res = await localStore.deleteReminder(id);
    this.mirrorToBackend(`/reminders/${id}`, { method: 'DELETE' });
    return res;
  }

  async toggleReminderActive(id: string) {
    const res = await localStore.toggleReminderActive(id);
    this.mirrorToBackend(`/reminders/${id}/toggle`, { method: 'POST' });
    return res;
  }

  async updateReminder(id: string, title: string, interval_type: string, interval_value: number, specific_time?: string, note?: string) {
    const rem = await localStore.updateReminder(id, title, interval_type, interval_value, specific_time, note);
    this.mirrorToBackend(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, note: note ?? '', interval_type, interval_value, specific_time }),
    });
    return rem;
  }

  // ─── Stats & Quotes (always local) ───

  getStats() { return localStore.getStats(); }
  getDailyQuote() { return Promise.resolve(localStore.getDailyQuote()); }
}

export const api = new ApiService();
