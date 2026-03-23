# Discipline OS - Product Requirements Document

## Overview
**Discipline OS** is a premium cross-platform mobile discipline tracker built with Expo/React Native and FastAPI. Users create goals, break them into roadmap milestones, manage daily tasks, set recurring reminders, and track streaks.

## Architecture
- **Frontend**: Expo SDK 54, React Native, expo-router (file-based routing)
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: Optional JWT-based email/password (moved to Settings)
- **Guest Mode**: Full app functionality via AsyncStorage (localStore.ts)
- **Data Layer**: Dual-mode api.ts - routes to local storage (guest) or backend API (authenticated)
- **Subscription**: Mock RevenueCat integration (ready for real SDK plug-in)
- **Design**: Monochrome with Electric Blaze (#FF3B30) accent, system theme detection

## Key Architecture Decision: Guest-First
- App opens directly to onboarding → home screen (NO auth gate)
- All features work without creating an account
- Data stored locally via AsyncStorage in guest mode
- Auth is optional, positioned as "Back up your data" in Settings
- When authenticated, data syncs via backend API automatically

## Features (MVP)

### Onboarding Flow (3 screens)
1. **Welcome**: Brand intro with "Build your system. Own your day." tagline
2. **Start**: Choose how to begin - Create own goal, Use a template (3 pre-built), or Explore
3. **Notifications**: Optional notification permission setup

### Goals & Milestones
- Create goals with title and description
- Add/toggle/delete milestones within goals
- Visual roadmap progress bar with numbered milestone badges
- 3 pre-built goal templates (Morning Routine, 30-Day Fitness, Learn a Skill)

### Daily Tasks
- Create daily tasks
- Toggle task completion (per day tracking)
- Visual checkbox with strikethrough
- Long-press to delete

### Recurring Reminders
- Create reminders with interval type (minutes/hours/daily)
- Configurable interval value
- Tab-based switcher between Tasks and Reminders

### Stats & Streaks
- Consecutive day streak tracking
- Total completions, goals, milestones counters
- Weekly activity bar chart
- Stats displayed in Settings screen

### Motivational Quotes
- 24+ curated discipline/productivity quotes
- Daily rotating quote on home dashboard
- Works offline in guest mode

### Subscription (MOCKED)
- Free plan: 1 goal, 10 tasks, 3 reminders
- Pro plan: Unlimited everything + advanced stats
- Paywall triggered when free limits hit (not on app open)
- Paywall with yearly ($29.99) and monthly ($4.99) options
- Restore purchases flow
- **Entitlement**: discipline_os_pro
- **Offering**: default with monthly/yearly packages

### Auth (Optional, in Settings)
- JWT email/password registration and login
- Positioned as "Back up your data" / "Sync across devices"
- Inline auth form within Settings (not a separate screen)
- Toggle between login/register modes
- Cloud sync badge when authenticated

## Navigation
- 4-tab layout: Home, Goals, Tasks, Settings
- Modal screens: Create Goal, Create Task, Create Reminder, Paywall
- Stack screens: Goal Detail, Onboarding

## Premium Empty States
- Goals: Trophy icon + "Set your first goal" + description + CTA
- Tasks: Checkbox icon + "Add your first task" + description + CTA
- Reminders: Bell icon + "Set up reminders" + description + CTA
- Home: "Your journey starts here" welcome card with dual CTAs

## Data Flow
- **Guest Mode**: localStore.ts → AsyncStorage (all CRUD operations)
- **Authenticated Mode**: api.ts → FastAPI backend → MongoDB
- **Switching**: api.ts auto-routes based on auth token presence

## API Endpoints (Backend - unchanged)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET/POST /api/goals` - List/create goals
- `GET/PUT/DELETE /api/goals/{id}` - Goal CRUD
- `POST /api/goals/{id}/milestones` - Add milestone
- `PUT/DELETE /api/goals/{id}/milestones/{mid}` - Toggle/delete milestone
- `GET/POST /api/tasks` - List/create tasks
- `POST /api/tasks/{id}/toggle` - Toggle task completion
- `DELETE /api/tasks/{id}` - Delete task
- `GET/POST /api/reminders` - List/create reminders
- `DELETE /api/reminders/{id}` - Delete reminder
- `GET /api/stats` - Get user stats
- `GET /api/quotes/daily` - Get daily quote

## Future Enhancements
- Real RevenueCat integration
- Google/Apple social auth
- AI-generated motivational quotes
- Calendar/history view with date picker
- Home screen widgets
- Push notifications for reminders
- Data migration from local to cloud on sign-up
- Sharing features
