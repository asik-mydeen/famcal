# Screensaver Ambient Info Overlay

> Date: 2026-03-30
> Status: Approved
> Scope: PhotoFrame component + App.js data computation

## Problem

The screensaver shows beautiful photos but is purely decorative. A wall-mounted family kiosk should surface at-a-glance family info (tasks due, today's meals, upcoming events) without permanently cluttering the photo display.

## Goal

After every 2nd photo transition, a cinema lower-third panel slides up, shows one info card for 8 seconds, then fades out. Cards cycle: Tasks → Meals → Events. Each card shows member-level detail with avatar colour dots. Feels like Sony/Samsung Frame TV ambient info — premium, not dashboard-like.

## Architecture

Two files change. No new component files.

### `src/App.js`
Computes `ambientInfo` from `state` (tasks, meals, events, members). Passes it as a new prop to `<PhotoFrame>`. All data filtering happens here — PhotoFrame stays presentational.

### `src/components/PhotoFrame/index.js`
Owns all timing and animation. New state: `showInfo` (boolean), `infoCardIndex` (0/1/2). Trigger logic hooks into the existing photo cycling `useEffect`. No changes to Ken Burns, clock, weather, art attribution, or dismiss behaviour.

## Data Shape

```js
// Passed as ambientInfo prop to PhotoFrame
{
  tasks: [
    {
      memberName: "Emma",
      memberColor: "#6C5CE7",
      items: ["Make bed", "Do homework"],   // max 2 per member
    },
    // max 3 members
  ],
  meals: [
    { type: "breakfast", label: "🌅 Breakfast", title: "Avocado toast" },
    { type: "lunch",     label: "☀️ Lunch",     title: "Chicken sandwich" },
    { type: "dinner",    label: "🌙 Dinner",    title: "Pasta Bolognese" },
    // only meals where title exists
  ],
  events: [
    {
      memberName: "Emma",
      memberColor: "#6C5CE7",
      title: "Soccer practice",
      timeLabel: "Today 4:00 PM",   // "Today HH:MM AM/PM" or "Tomorrow" or day name
    },
    // max 4 events
  ],
  totalPendingTasks: 5,
}
```

## Data Filtering Rules (App.js)

**Tasks:**
- Filter: `!task.completed && (task.due_date <= today || !task.due_date)`
- Group by `assigned_to` member. Join member name + colour via `members` array.
- Max 3 members, 2 tasks each (truncate with "+" if more).
- Unassigned tasks listed under a "Family" row (no colour dot, grey).

**Meals:**
- Filter: `meal.date === today`
- Include only meals with a title. Show in meal_type order: breakfast → lunch → dinner.

**Events:**
- Filter: `event.start >= today (start of day) && event.start < today + 2 days`
- Sort by start time ascending. Max 4 events.
- Time label: if today → "Today H:MM AM/PM", if tomorrow → "Tomorrow", else day name.
- All-day events: show "Today · All day" or "Tomorrow · All day".

## Timing & Animation (PhotoFrame)

```
Photo transition fires (existing useEffect)
    │
    ├─ increment photoTransitionCount (module var)
    └─ if photoTransitionCount % 2 === 0 → showInfoPanel()

showInfoPanel():
    setShowInfo(true)
    setTimeout(() => setShowInfo(false), 8000)   // 8s display
    setInfoCardIndex(prev => (prev + 1) % activeCardCount)
```

`activeCards` = ordered array of card keys where data is non-empty:
```js
const activeCards = [
  ambientInfo?.tasks?.length  > 0 && "tasks",
  ambientInfo?.meals?.length  > 0 && "meals",
  ambientInfo?.events?.length > 0 && "events",
].filter(Boolean);
// e.g. ["tasks", "events"] if no meals planned today
```
`infoCardIndex` cycles through `activeCards` indices. If `activeCards.length === 0`, panel never shows.

**CSS transitions:**
- Enter: `transform: translateY(100%) → translateY(0)`, duration 600ms, ease-out
- Exit: `opacity: 1 → 0`, duration 1000ms, ease-in (triggered by `showInfo → false`)
- Both driven by a single `showInfo` boolean — no framer-motion needed (plain CSS transition on sx)

**Module var (avoids CRA closure bugs):**
```js
let moduleTransitionCount = 0;
```
Reset to 0 on PhotoFrame mount (cleanup return).

## Card Layouts

### Card 1 — Today's Tasks
```
TODAY'S TASKS  ·  N pending                [task_alt icon]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● Emma    Make bed · Do homework
● Alex    Take out trash · Feed the cat
● Liam    Walk the dog
```
Member dot: 10px circle filled with `member.avatar_color`.
Items: comma/dot-separated inline. Font: 0.85rem, weight 400, white 80% opacity.
Header: 0.65rem uppercase tracking, white 50% opacity. Count badge: accent-coloured pill.

### Card 2 — Today's Meals
```
TODAY'S MEALS                              [restaurant icon]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌅  Breakfast   Avocado toast
☀️  Lunch       Chicken sandwich
🌙  Dinner      Pasta Bolognese
```
Three rows in a grid: emoji + meal type label (0.72rem, muted) + meal title (0.9rem, white).

### Card 3 — Coming Up
```
COMING UP                                  [event icon]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● Emma    Soccer practice      Today 4:00 PM
● Alex    Dentist appt         Tomorrow 2:00 PM
● Family  Birthday dinner      Saturday
```
Same member dot pattern as Tasks. Time label right-aligned, 0.75rem, white 60% opacity.

## Visual Spec

```
Full-screen photo (z-index 9999)
└── lower-third panel (position: absolute, bottom: 0, left: 0, right: 0)
    background: rgba(0,0,0,0.55)
    backdropFilter: blur(20px)
    borderTop: 1px solid rgba(255,255,255,0.08)
    padding: 24px 40px 32px
    └── gradient fade at top: linear-gradient(transparent, rgba(0,0,0,0.55)) height: 40px
    └── card content
```

**Clock and weather positioning:** When the panel is visible, the clock (`bottom: 40, left: 40`) and weather (`bottom: 40, right: 40`) would render inside the panel. Fix: animate their `bottom` value upward when `showInfo` is true.

- Normal: `bottom: 40`
- Panel visible: `bottom: 280` (clears the panel top edge with breathing room)
- Transition: `transition: bottom 500ms ease-out` — they float up as the panel rises, settle back down as it fades

This is driven by the same `showInfo` boolean. No extra state needed.

## What Does NOT Change

- Ken Burns animation
- Photo crossfade
- Clock and date overlay
- Weather overlay
- Art attribution overlay
- "Tap to dismiss" hint
- All dismiss / reset behaviour
- PhotoFrame PropTypes (add `ambientInfo` as optional shape)

## Acceptance Criteria

1. Info panel appears after every 2nd photo transition
2. Panel slides up from bottom edge, stays 8 seconds, fades out
3. Cards cycle: Tasks → Meals → Events (skips empty cards)
4. Each task/event row shows correct member avatar dot colour + name
5. No info panel when `ambientInfo` is not provided or all cards are empty
6. Clock/weather remain visible and unobstructed
7. Tap to dismiss still works (onDismiss fires, doesn't conflict with panel)
8. No regressions on Ken Burns, crossfade, or art attribution
