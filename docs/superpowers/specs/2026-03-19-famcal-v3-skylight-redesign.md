# FamCal v3.0 — Skylight-Inspired Complete Redesign

> Status: Approved
> Date: 2026-03-19
> Scope: Full UI revamp + 8 new features

## 1. Overview

Transform FamCal from a basic family calendar app into a premium Skylight/Cozyla-class family hub optimized for wall-mounted displays. This involves a complete visual overhaul, new navigation architecture, and 8 new features.

### Goals
- Match the premium feel of Skylight Calendar and Cozyla Calendar
- Optimize for wall-mounted tablets (glanceable, touch-friendly, kiosk-ready)
- Add missing family hub features (meals, lists, photos, chore chart, weather, countdowns, notes)
- Maintain existing gamification system (points, levels, streaks, rewards)

### Non-Goals
- Recipe database or meal suggestion AI
- Smart home integration
- Video calls or messaging
- Multi-family support

## 2. Visual Identity — "Warm & Bold"

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#6C5CE7` | Accent, active tabs, buttons |
| `primary.light` | `#A29BFE` | Hover, gradients |
| `primary.dark` | `#5A4BD1` | Pressed states |
| `secondary.main` | `#00B894` | Success, completed, positive |
| `error.main` | `#E17055` | Errors, delete, Mom's color |
| `warning.main` | `#FDCB6E` | Warnings, Aaraa's color |
| `info.main` | `#0984E3` | Informational, links |
| `background.default` | `#FFF8F0` → `#FFFFFF` | Cream-to-white gradient |
| `background.paper` | `#FFFFFF` | Cards, panels |
| `text.primary` | `#1A1A1A` | Main text |
| `text.secondary` | `#8B8680` | Secondary text |
| `divider` | `rgba(0,0,0,0.04)` | Borders |

- Cards: Solid white, `box-shadow: 0 2px 8px rgba(0,0,0,0.04)`, `border: 1px solid rgba(0,0,0,0.04)`
- Events: Color-tinted background fills (`rgba(memberColor, 0.1)`) with 4px left border in member color
- Active tab: Purple gradient (`#6C5CE7` → `#A29BFE`) with `box-shadow: 0 3px 10px rgba(108,92,231,0.25)`
- Font: Inter, heavy use of 700/800 weights for readability at distance
- Border radius: 16px cards, 12px buttons/inputs, 10px chips/tabs

### Dark Mode
- Retains existing glassmorphism system (backdrop-filter blur, semi-transparent backgrounds)
- Same accent gradient (`#6C5CE7` → `#A29BFE`)
- Background: `#0A0A1A` with animated mesh gradient
- Event cards use higher opacity fills in dark mode

**Dark mode variants for new components (mandatory):**
- ChoreGrid: cells use `rgba(255,255,255,0.05)` background, borders `rgba(255,255,255,0.08)`
- MealGrid: same cell treatment as ChoreGrid
- Lists: list items use `rgba(255,255,255,0.08)` background
- Notes: note cards use glassmorphism (`backdrop-filter: blur(10px)`, `rgba(255,255,255,0.06)`)
- Countdowns: same background treatment as existing event cards in dark mode
- HeaderBar: `rgba(10,10,26,0.95)` with `backdrop-filter: blur(20px)`, border `rgba(255,255,255,0.06)`
- TabStrip: active tab keeps purple gradient; inactive uses `rgba(255,255,255,0.4)` text

### Member Colors
| Member | Color | Hex |
|--------|-------|-----|
| Asik (Dad) | Purple | `#6C5CE7` |
| Nikkath (Mom) | Coral | `#E17055` |
| Aarish (Son) | Green | `#00B894` |
| Aaraa (Daughter) | Gold | `#FDCB6E` |

Colors used consistently across all views: event cards, chore chart, notes, avatars, task assignments.

## 3. Layout Architecture

### Three-Layer System

**Layer 1 — Header Bar (always visible on all tabs):**
- Left: Day name + date (large, bold)
- Right: Weather widget | Top countdown pill | Family avatar stack | Digital clock
- Sticky, white background with subtle bottom border
- Height: ~60px

**Layer 2 — Tab Strip (below header):**
- Tabs: Calendar | Chores | Meals | Lists | Rewards | Family | Settings (gear icon)
- Active tab: Purple gradient pill with shadow
- Inactive: Gray text
- Right side of tab strip: View toggle (Day/Month on Calendar tab)
- Desktop/tablet: horizontal top tabs
- Mobile (<768px): bottom floating nav with icons

**Layer 3 — Content Area:**
- Each tab renders full-screen content
- Calendar tab includes a right sidebar panel (280px wide)

### Smart Sidebar (Calendar tab only)
The sidebar contains ambient information widgets stacked vertically:
1. **Family Notes** — color-coded member messages, add button, pin/dismiss
2. **Countdowns** — pinned events with days remaining, bold count
3. **Today's Chores** — checklist with completion status and points
4. **Tonight's Dinner** — current day's dinner meal from meal plan

**Responsive behavior:**
- Desktop/tablet landscape (1024px+): Sidebar visible alongside calendar. Collapse toggle (chevron icon) at sidebar top. Collapse state persists in localStorage.
- Tablet portrait (768-1023px): Sidebar collapses to a persistent bottom sheet (MUI Drawer variant="persistent"). Starts closed. Swipe up from bottom edge or tap "Today" button in header to open. Tap outside or swipe down to dismiss. Bottom sheet renders above mobile nav (z-index: nav=100, sheet=200).
- Mobile (<768px): Sidebar content becomes a "Today" tab in bottom nav

## 4. Feature Specifications

### 4.1 Calendar Tab (Enhanced)

**Existing functionality preserved:**
- Day view with timeline (6 AM - 11 PM)
- Month view via FullCalendar
- Per-member event color coding
- Google Calendar 2-way sync
- Event CRUD dialogs
- Now indicator (red line)
- Auto-scroll to current time

**Changes:**
- Visual style update (color-tinted event cards with left border instead of current style)
- Header bar replaces current date navigation (date in header, chevrons for prev/next day)
- Tab strip replaces bottom nav for calendar/month toggle
- Smart sidebar added to right side
- Family events (everyone) use dashed border style to distinguish from member events
- Simultaneous events for different members display side-by-side in the same time slot

### 4.2 Chores Tab (Replaces Tasks)

**Visual Chore Chart (default view):**
- Grid layout: Rows = chores, Columns = days of the week (Mon-Sun)
- Each cell shows: checkmark (done), empty circle (pending), or X (missed)
- Chore row shows: colored dot (assigned member), chore name, points value
- Current day column highlighted
- Tap cell to toggle completion (awards points)
- Weekly view with prev/next week navigation

**List View (toggle):**
- Same as current task list but with updated visual style
- Filter by member, category, status
- Sort by due date, priority, points

**Preserved from current Tasks:**
- All task fields (title, description, assigned_to, due_date, due_time, recurring, points_value, category, priority)
- Gamification (points awarded on completion, streak tracking)
- Task CRUD dialogs
- Stats cards (today's progress, pending, completed, points today)

**New:**
- Grid/List view toggle
- Weekly chore grid as default view
- "Recurring" tasks auto-populate the weekly grid

### 4.3 Meals Tab (New)

**Weekly Meal Plan Grid:**
- Layout: Rows = days (Mon-Sun), Columns = meal types (Breakfast, Lunch, Dinner, Snacks)
- Each cell: Tap to add/edit meal (inline text input or small dialog)
- Current day row highlighted
- Week navigation (prev/next week)

**Features:**
- Simple text entry for meals (no recipe database)
- "Copy Last Week" button to duplicate previous week's plan
- "Add to Grocery List" button per meal: opens a pre-filled dialog where the meal title is the default text. User can edit, split into multiple items, or add custom items before confirming. Items are added to the default "Groceries" list. No automatic ingredient parsing — the user manually specifies what to add.
- Tonight's dinner auto-displays in calendar sidebar widget
- Color accent on dinner column (most planned meal)

**Data model:**
```
meals: id, family_id, date, meal_type (breakfast|lunch|dinner|snack), title, notes, created_at
```

### 4.4 Lists Tab (New)

**Multiple Shared Lists:**
- Tab bar within Lists tab for switching between lists (Groceries, Shopping, To-Do, custom)
- Each list has categorized items with check-off
- "+" button to create new lists

**List Item Features:**
- Text input with auto-categorization for groceries (Produce, Dairy, Meat, Pantry, Frozen, Other)
- Check to mark done (strikethrough, moves to bottom)
- Swipe to delete
- "Added by" member indicator
- Clear completed button

**Grocery List Integration:**
- "Add ingredients" from Meals tab auto-populates grocery list
- Categories auto-assigned based on item name

**Data model:**
```
lists: id, family_id, name, icon, sort_order, created_at
list_items: id, list_id, text, category, checked, checked_at, added_by (member_id), sort_order, created_at
```

### 4.5 Photo Frame Mode (New)

**Behavior:**
- Triggered by: idle timeout (configurable, default 5 min) OR manual toggle in Settings
- Fullscreen overlay — covers entire app including header/tabs
- Tap anywhere to dismiss and return to calendar
- During photo mode: small clock + weather overlay in bottom-right corner (semi-transparent)

**Photo Management:**
- Upload photos via Settings page (drag-drop or file picker)
- Photos stored in Supabase Storage bucket `family-photos/{family_id}/`
- Configurable slideshow interval (3s, 5s, 10s, 15s, 30s)
- Crossfade transition between photos
- Random or sequential order (configurable)

**Upload constraints:**
- Max 100 photos per family. Beyond this, show error: "Photo limit reached. Delete old photos to add new ones."
- Max file size: 5MB per photo. Auto-compressed to JPEG 1920x1080 on client before upload (using canvas).
- Allowed formats: JPEG, PNG, WebP. Other formats show validation error.
- Deleting a photo hard-deletes from Supabase Storage.
- If Supabase Storage is not configured, show message in Settings: "Connect Supabase to enable photo uploads."

**Data model:**
```
photos: id, family_id, storage_path, caption, sort_order, uploaded_by (member_id), created_at
```

### 4.6 Weather Widget (New)

**Header Display (always visible):**
- Icon (sun, cloud, rain, etc.) + current temperature + condition text
- Compact pill format in header bar

**Sidebar Display (Calendar tab):**
- Current conditions (larger)
- 3-day forecast: day name, icon, high/low temps

**Implementation:**
- Free tier weather API (OpenWeatherMap free tier — 1000 calls/day)
- Location configured in Settings (city name or coordinates), stored in `families.weather_location`
- Cached in localStorage with 30-minute refresh interval
- API key stored in environment variable `REACT_APP_WEATHER_API_KEY` (single-tenant, one key for the app — NOT per-family since multi-family is a non-goal)
- Weather loads within 3 seconds or shows "Loading..." placeholder. If API fails, shows "--°" with tooltip "Weather unavailable"
- Graceful fallback: if no API key or location configured, weather widget hidden entirely (no empty space)

### 4.7 Event Countdowns (New)

**Header Display:**
- Top/nearest countdown shown as a pill in the header bar
- Format: "[icon] [event name] [X days]"

**Sidebar Display:**
- List of all active countdowns with days remaining
- Bold day count, event name, colored background

**Features:**
- Create countdown from any calendar event (pin button)
- Manual countdown creation (title, target date, icon, color)
- Celebration animation when countdown reaches 0 (confetti burst, auto-dismiss after 5s)

**Birthday countdown logic:**
- On app load, check if any family member has a birthday within the next 90 days
- If no countdown exists for that birthday in the current year, auto-create one with `auto_generated: true`
- Birthday countdowns use the member's color and a "cake" icon
- After the birthday passes, the countdown is soft-deleted (hidden, not removed from DB)
- Next year, a new countdown is auto-created for the upcoming birthday
- Users can hide (but not delete) auto-generated countdowns via a dismiss button
- Manual countdowns are fully deletable by the user

**Data model:**
```
countdowns: id, family_id, title, target_date, icon (material icon name), color, source_event_id (nullable), auto_generated (boolean), created_at
```

### 4.8 Family Notes (New)

**Sidebar Display:**
- Stacked note cards, color-coded by member (left border in member color)
- Each note: text, member name, time ago
- "+" button to add note
- Tap note to edit/delete
- Pin icon to keep permanently

**Features:**
- Quick add: text input + member selector
- Auto-expire after 24 hours unless pinned (configurable)
- Maximum 10 visible notes (oldest unpinned auto-archive)
- Member color coding matches the global member color system

**Data model:**
```
notes: id, family_id, member_id, text, pinned (boolean), expires_at (timestamp, nullable), created_at
```

### 4.9 Kiosk Mode (New)

**Toggle in Settings. When enabled:**
- **Auto-hide navigation**: Tab strip fades out after 5 seconds of inactivity. Tap top 60px edge of screen to reveal.
- **Fullscreen**: Uses Fullscreen API to hide browser chrome. Prompt shown on first enable.
- **Wake Lock**: Uses Screen Wake Lock API to prevent display from sleeping.
- **Font scale**: All text scaled up 120% for distance readability (applied via CSS `font-size` on root element).
- **No scroll**: Content fits viewport. Day view shows max 10 events; if more exist, a "+X more" indicator appears. Tap "+X more" to enable scrolling temporarily.
- **Photo frame on idle**: After configurable timeout (default 5 min), transitions to photo slideshow. Tapping during photo frame returns to calendar in kiosk mode (tabs remain auto-hidden).
- **Touch optimization**: All interactive elements minimum 60px hit area.

**Edge cases & fallbacks:**
- **Fullscreen API not supported** (e.g., iOS Safari): Display a banner in Settings: "For best experience, add to Home Screen for fullscreen mode." On iOS, recommend PWA mode via "Add to Home Screen."
- **Wake Lock API not supported** (e.g., older browsers, iOS): Display warning in Settings: "Screen wake lock not available on this browser. Your device may sleep during use."
- **Exiting kiosk mode**: Settings page always shows "Exit Kiosk Mode" button at the top, visible even when tabs are auto-hidden (permanently pinned).

**Idle detection:** Timer resets on any pointer movement, touch event, or keyboard input. Timer pauses if browser tab is not visible (Page Visibility API).

**Settings additions:**
- Kiosk mode toggle
- Idle timeout slider (1-30 min)
- Font scale slider (100%-150%)
- Photo frame on/off separately from kiosk

## 5. Navigation Changes

| v2 (Current) | v3 (New) | Notes |
|--------------|----------|-------|
| Bottom floating nav (5 items) | Top tab strip (7 items) | Desktop/tablet |
| Calendar, Tasks, Family, Rewards, Settings | Calendar, Chores, Meals, Lists, Rewards, Family, Settings | Mobile keeps bottom nav |
| — | Photo Frame | Not a tab — overlay mode |
| — | Smart Sidebar | Calendar tab only, ambient widgets |

**Mobile (<768px):** Bottom nav with icons: Calendar, Chores, Meals, Lists, More (dropdown for Rewards, Family, Settings). "Today" tab replaces sidebar.

## 6. New Supabase Tables

```sql
-- Meals
CREATE TABLE meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_meals_family_date ON meals(family_id, date);

-- Lists
CREATE TABLE lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'checklist',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- List Items
CREATE TABLE list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  added_by UUID REFERENCES family_members(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Notes
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  text TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Countdowns
CREATE TABLE countdowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE NOT NULL,
  icon TEXT DEFAULT 'celebration',
  color TEXT DEFAULT '#6C5CE7',
  source_event_id UUID,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family table additions
ALTER TABLE families ADD COLUMN IF NOT EXISTS weather_location TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS kiosk_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS photo_interval INT DEFAULT 5;
ALTER TABLE families ADD COLUMN IF NOT EXISTS idle_timeout INT DEFAULT 300;
ALTER TABLE families ADD COLUMN IF NOT EXISTS font_scale FLOAT DEFAULT 1.0;
```

## 7. FamilyContext Changes

### New State Fields
```js
{
  ...existingState,
  meals: [],        // Weekly meal plan entries
  lists: [],        // { id, name, icon, items: [] }
  notes: [],        // Family sticky notes
  countdowns: [],   // Pinned event countdowns
  photos: [],       // Photo frame images
  weather: null,    // { temp, condition, icon, forecast: [] }
  kioskMode: false, // Kiosk mode active
}
```

### New Actions
- `SET_MEALS`, `ADD_MEAL`, `UPDATE_MEAL`, `REMOVE_MEAL`
- `SET_LISTS`, `ADD_LIST`, `REMOVE_LIST`, `ADD_LIST_ITEM`, `TOGGLE_LIST_ITEM`, `REMOVE_LIST_ITEM`
- `SET_NOTES`, `ADD_NOTE`, `UPDATE_NOTE`, `REMOVE_NOTE`
- `SET_COUNTDOWNS`, `ADD_COUNTDOWN`, `REMOVE_COUNTDOWN`
- `SET_PHOTOS`, `ADD_PHOTO`, `REMOVE_PHOTO`
- `SET_WEATHER`
- `SET_KIOSK_MODE`

### State Architecture Note
With ~35+ action types, the FamilyContext reducer will be large. If it exceeds 400 lines during implementation, split into domain-specific contexts:
- `CalendarContext` — events, Google sync state
- `ChoresContext` — tasks/chores, gamification
- `HubContext` — meals, lists, notes, countdowns, photos, weather

All toggle actions (list item check, chore completion, note pinning) should use optimistic updates: update local state immediately, fire-and-forget Supabase call, revert on error via a `ROLLBACK_*` action pattern.

### Loading States
Replace the single `loading` boolean with per-entity loading:
```js
loading: { meals: false, lists: false, notes: false, countdowns: false, photos: false, weather: false }
```

## 8. File Structure (New/Modified)

```
src/
  layouts/
    family-calendar/index.js    # MODIFIED — new visual style, sidebar integration
    chores/index.js             # NEW — replaces tasks/, grid + list views
    meals/index.js              # NEW — weekly meal plan
    lists/index.js              # NEW — shared shopping/grocery lists
    rewards/index.js            # MODIFIED — updated visual style
    family/index.js             # MODIFIED — updated visual style
    settings/index.js           # MODIFIED — add weather, kiosk, photo settings
    tasks/index.js              # DEPRECATED — functionality moves to chores/
  components/
    HeaderBar/index.js          # NEW — persistent header with date, weather, clock
    TabStrip/index.js           # NEW — top navigation tabs (replaces FloatingNav on desktop)
    SmartSidebar/index.js       # NEW — calendar sidebar with widgets
    WeatherWidget/index.js      # NEW — weather display (header + sidebar versions)
    CountdownWidget/index.js    # NEW — countdown display (header pill + sidebar list)
    NotesWidget/index.js        # NEW — family notes sidebar widget
    ChoreGrid/index.js          # NEW — visual chore chart grid
    MealGrid/index.js           # NEW — weekly meal plan grid
    PhotoFrame/index.js         # NEW — fullscreen photo slideshow overlay
    KioskWrapper/index.js       # NEW — kiosk mode container (wake lock, fullscreen, auto-hide)
    FloatingNav/index.js        # MODIFIED — updated tabs for mobile, hidden on desktop
    GlassCard/index.js          # MODIFIED — updated visual style
    PageTransition/index.js     # KEPT — same animations
    AnimatedBackground/index.js # MODIFIED — updated light mode gradient
  context/
    FamilyContext.js             # MODIFIED — new state fields and actions
  lib/
    weather.js                  # NEW — weather API integration
    supabase.js                 # MODIFIED — new table operations
  assets/
    theme/index.js              # MODIFIED — Warm & Bold color palette
```

## 9. Migration Plan (v2 → v3)

### Database Migration
1. Run all `CREATE TABLE` statements for new tables (meals, lists, list_items, notes, countdowns, photos) — no conflict with existing data
2. Run `ALTER TABLE families` to add new columns with defaults — existing families get default values automatically
3. Create a default "Groceries" list for each existing family: `INSERT INTO lists (family_id, name, icon) SELECT id, 'Groceries', 'shopping_cart' FROM families`

### Task → Chore Migration
- **No data migration needed.** The existing `tasks` table is reused as-is. The new Chores tab reads from the same `tasks` table but renders differently (grid view vs list view).
- The `tasks/index.js` page is deprecated but the route redirects to `/chores`. No task data is deleted or moved.
- Recurring tasks auto-populate the weekly chore grid by generating virtual cells from `recurring_pattern`.
- Non-recurring tasks appear in the list view only (not in the grid).

### Frontend Migration
- **Incremental deployment**: New components are added alongside existing ones. Routes update atomically.
- **No breaking API changes**: Supabase schema only adds tables/columns, never modifies existing ones.
- **localStorage keys**: New keys for sidebar collapse state, weather cache, kiosk settings. No conflict with existing keys (`famcal_dark_mode`, auth tokens).

### Rollback
- If v3 deploy fails: revert to v2 frontend. New Supabase tables are harmless (unused by v2 code).
- No destructive database changes — rollback only requires reverting the frontend bundle.

## 10. Acceptance Criteria

1. All 7 tabs render with new visual style (Warm & Bold)
2. Header bar shows date, weather (within 3s or placeholder), countdown, avatars, clock on all tabs
3. Calendar tab has functioning smart sidebar with notes, countdowns, chores, dinner
4. Chore chart grid view works with tap-to-complete and points awarding
5. Meal plan grid allows adding/editing meals and "add to grocery list" (manual flow with pre-filled dialog)
6. Lists tab supports multiple lists with categorized items and check-off
7. Photo frame activates on idle (timer resets on pointer/touch/keyboard) and dismisses on tap
8. Weather updates from OpenWeatherMap API and displays in header + sidebar; hidden if unconfigured
9. Countdowns auto-generate from birthdays (90-day lookahead) and allow manual creation
10. Family notes support add, pin, auto-expire (24h default)
11. Kiosk mode enables fullscreen (with iOS fallback banner), wake lock (with browser warning fallback), auto-hide tabs, font scaling
12. Mobile layout uses bottom nav; desktop uses top tabs
13. Sidebar collapses to persistent bottom sheet on tablet portrait (starts closed, swipe up to open)
14. Dark mode works with all new components — each new component has explicit dark mode variant
15. All new data persists to Supabase when connected; works offline with in-memory state
16. Existing features (Google Calendar sync, gamification, rewards) remain functional
17. All new components render within 200ms on mid-tier devices (iPhone 12 baseline)
18. Photo upload validates format (JPEG/PNG/WebP), size (5MB max), and count (100 max)
