# Discipline OS - Product Requirements Document

## Overview
**Discipline OS** is a premium cross-platform mobile discipline tracker built with Expo/React Native and FastAPI. Users create goals, break them into roadmap milestones, manage daily tasks, set recurring reminders, and track streaks.

## Architecture
- **Frontend**: Expo SDK 54, React Native, expo-router (file-based routing)
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: JWT-based email/password authentication
- **Subscription**: Mock RevenueCat integration (ready for real SDK plug-in)
- **Design**: Monochrome with Electric Blaze (#FF3B30) accent, system theme detection

## Features (MVP)
### Authentication
- Email/password registration and login
- JWT token-based sessions (7-day expiry)
- Structured for future Google/Apple sign-in

### Goals & Milestones
- Create goals with title and description
- Add/toggle/delete milestones within goals
- Visual roadmap progress bar
- Goal detail screen with numbered milestone badges

### Daily Tasks
- Create daily tasks
- Toggle task completion (per day tracking)
- Visual checkbox with strikethrough animation
- Long-press to delete

### Recurring Reminders
- Create reminders with interval type (minutes/hours/daily)
- Configurable interval value
- Tab-based switcher between Tasks and Reminders

### Stats & Streaks
- Consecutive day streak tracking
- Total completions, goals, milestones counters
- Weekly activity bar chart
- Profile page with all stats

### Motivational Quotes
- 30+ curated discipline/productivity quotes
- Daily rotating quote on home dashboard
- Structured for future AI-generated quote swap

### Subscription (MOCKED)
- Free plan: 1 goal, 10 tasks, 3 reminders
- Pro plan: Unlimited everything + advanced stats
- Paywall with yearly ($29.99) and monthly ($4.99) options
- Restore purchases flow
- **Entitlement**: discipline_os_pro
- **Offering**: default with monthly/yearly packages
- Ready for real RevenueCat integration

## Navigation
- 4-tab layout: Home, Goals, Tasks, Profile
- Modal screens: Create Goal, Create Task, Create Reminder, Paywall
- Stack screens: Goal Detail

## API Endpoints
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
- `GET /api/health` - Health check

## Data Model (MongoDB)
- **users**: id, email, password_hash, name, subscription, created_at
- **goals**: id, user_id, title, description, target_date, is_active, milestones[], created_at
- **tasks**: id, user_id, title, created_at
- **task_completions**: id, task_id, user_id, date, completed_at
- **reminders**: id, user_id, title, interval_type, interval_value, specific_time, is_active, created_at

## Future Enhancements
- Real RevenueCat integration
- Google/Apple social auth
- AI-generated motivational quotes
- Calendar/history view
- Widgets support
- Push notifications for reminders
- Cloud sync and sharing
