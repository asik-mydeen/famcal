# FamCal - Family Calendar & Task Manager

A Skylight/Cozyla-inspired family hub for managing calendars, tasks, and rewards. Built with React + Material UI, optimized for large touch screens, with Supabase for data persistence.

## Features

- **Family Calendar** - Unified calendar showing all family members' events with color-coded filters. Supports month/week/day views. Click dates to add events.
- **Task Management** - Assign tasks to family members with due dates, priorities, categories, and point values. Tap to complete.
- **Gamification** - Points system with levels, streaks, and a leaderboard. Kids earn points for completing tasks and redeem them for rewards.
- **Rewards Store** - Create custom rewards (screen time, movie pick, ice cream trips) that family members can claim with earned points.
- **Family Members** - Manage profiles with custom avatars, colors, and Google Calendar IDs. Track individual stats and streaks.
- **Google Calendar Ready** - Connect each family member's Google Calendar to sync events automatically.
- **Supabase Storage** - Full database schema included. Works with local state by default, connects to Supabase when configured.
- **Touch Optimized** - 44px+ touch targets, swipe-friendly, scales for wall-mounted displays and tablets.

## Quick Start

```bash
npm install --legacy-peer-deps
npm start
```

The app runs on http://localhost:3000.

## Pages

| Route | Description |
|-------|-------------|
| `/calendar` | Family calendar with multi-person event view |
| `/tasks` | Task management with filters, categories, and completion |
| `/family` | Family member profiles, levels, and stats |
| `/rewards` | Leaderboard and rewards store |
| `/settings` | Supabase, Google Calendar, and display settings |

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from Settings > Database Schema in the app
3. Add to `.env`:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart the app

## Display Mode

For a Skylight-like wall display experience:
- Use a tablet or monitor in landscape mode
- Enable fullscreen (F11)
- Touch-optimized mode is on by default

## Tech Stack

- React 16.8+
- Material UI 5
- FullCalendar 6
- Supabase JS Client
- React Router 6
- Emotion (CSS-in-JS)
