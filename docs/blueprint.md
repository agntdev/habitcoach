# Personal Habit Coach — Bot specification

**Archetype:** workflow

**Voice:** encouraging and warm — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot that helps users build habits through customizable schedules, local-time reminders, single-tap check-ins (Done/Skip/Miss), streak tracking, milestone celebrations, and weekly recaps with progress summaries.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual productivity seekers
- habit builders
- self-improvement enthusiasts

## Success criteria

- users create and track 3+ habits per account
- 90% of scheduled reminders trigger nudges
- check-in completion rates visible in weekly recaps

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with habit creation and dashboard options
- **Create New Habit** (button, actor: user, callback: habit:create) — Launch habit creation wizard with schedule configuration
- **My Habits** (button, actor: user, callback: habits:dashboard) — Show swipeable habit cards with current status
- **Weekly Recap** (button, actor: user, callback: recap:weekly) — Display 7-day progress summary for all habits

## Flows

### habit_creation
_Trigger:_ habit:create

1. collect habit title
2. select schedule type (daily/weekdays/N times/week)
3. set reminder time
4. confirm timezone preference

_Data touched:_ Habit

### daily_reminder
_Trigger:_ scheduled local time

1. send initial reminder
2. send hourly nudges up to 6 times
3. record check-in status (Done/Skip/Miss)

_Data touched:_ Check-in, Streaks

### milestone_celebration
_Trigger:_ streak reaches 7/14/30/90 days

1. generate stats summary
2. send encouraging milestone message

_Data touched:_ Streaks, Milestones

### weekly_recap
_Trigger:_ weekly schedule or button press

1. compile 7-day timeline
2. calculate completion rates
3. show encouragement for missed days

_Data touched:_ Check-in, Habit

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with private habit data
  - fields: telegram_id, timezone
- **Habit** _(retention: persistent)_ — User-defined habit with schedule rules
  - fields: title, schedule_type, reminder_time, active_status
- **Check-in** _(retention: persistent)_ — Daily habit progress recording
  - fields: timestamp, status, habit_id
- **Streaks** _(retention: persistent)_ — Consecutive habit completion tracking
  - fields: current_streak, longest_streak, habit_id
- **Milestones** _(retention: persistent)_ — Progress thresholds for celebration
  - fields: days_reached, habit_id

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- create/edit/delete habits
- pause/resume schedules
- view check-in history
- manual weekly recap trigger

## Notifications

- local-time habit reminders with nudges
- milestone celebration messages
- weekly progress recaps

## Permissions & privacy

- all user data private by default
- no cross-user data sharing
- check-in history accessible only to account owner

## Edge cases

- timezone changes during streak tracking
- missed check-ins within 48hr grace period
- multiple habit reminders on same calendar day

## Required tests

- end-to-end reminder nudge flow with check-in locking
- streak preservation after skipped days
- weekly recap accuracy with mixed check-in statuses

## Assumptions

- users prefer local-time reminders over UTC
- hourly nudges stop after 6 attempts
- skipped check-ins preserve streak if resumed within 48h
