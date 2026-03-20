# FamCal v3.0 Skylight Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform FamCal into a premium Skylight/Cozyla-class family hub with 8 new features, complete visual overhaul, and wall-display optimization.

**Architecture:** Calendar-centric hub with persistent header bar, top tab strip (desktop) / bottom nav (mobile), smart sidebar on calendar tab. New features are independent tabs (Chores, Meals, Lists) and ambient widgets (Weather, Countdowns, Notes). Photo frame is an overlay; kiosk mode is a wrapper.

**Tech Stack:** React 16.8+, MUI 5, Framer Motion, Supabase, FullCalendar, plain JavaScript (no TypeScript)

**Spec:** `docs/superpowers/specs/2026-03-19-famcal-v3-skylight-redesign.md`

---

## Phase Overview

| Phase | Tasks | Parallel? | Depends On |
|-------|-------|-----------|------------|
| 1. Foundation | Theme + Layout + Nav | Sequential | — |
| 2. Calendar + Sidebar | Enhanced calendar + sidebar shell | Sequential | Phase 1 |
| 3a. State + Data | Extend FamilyContext + Supabase for ALL new features | Sequential | Phase 1 |
| 3b. New Tabs | Chores, Meals, Lists | **All 3 parallel** | Phase 3a |
| 4a. Widget Slots | Prepare HeaderBar + SmartSidebar widget slots | Sequential | Phase 2 |
| 4b. Widgets | Weather, Countdowns, Notes | **All 3 parallel** | Phase 4a |
| 5. Overlay Features | Photo Frame, Kiosk Mode | **Both parallel** | Phase 1 |
| 6. Integration | Wiring, polish, smoke test | Sequential | All above |

**Parallelization strategy:** Shared files (FamilyContext.js, supabase.js, HeaderBar, SmartSidebar) are modified in dedicated sequential prep tasks (3a, 4a). Parallel agents only create NEW files unique to their feature.

## File Structure

```
src/
  App.js                                    # MODIFY — replace FloatingNav with HeaderBar+TabStrip, add routes
  assets/theme/index.js                     # MODIFY — Warm & Bold palette
  components/
    AnimatedBackground/index.js             # MODIFY — cream-to-white gradient
    FloatingNav/index.js                    # MODIFY — new tabs for mobile, hide on desktop
    GlassCard/index.js                      # MODIFY — updated shadows/colors
    PageTransition/index.js                 # KEEP — no changes
    HeaderBar/index.js                      # CREATE — persistent header (date, weather, countdown, clock)
    TabStrip/index.js                       # CREATE — top tab navigation for desktop
    SmartSidebar/index.js                   # CREATE — calendar sidebar container
    WeatherWidget/index.js                  # CREATE — header pill + sidebar detail
    CountdownWidget/index.js                # CREATE — header pill + sidebar list
    NotesWidget/index.js                    # CREATE — sidebar notes with CRUD
    ChoreGrid/index.js                      # CREATE — visual chore chart grid
    MealGrid/index.js                       # CREATE — weekly meal plan grid
    PhotoFrame/index.js                     # CREATE — fullscreen slideshow overlay
    KioskWrapper/index.js                   # CREATE — kiosk mode container
  context/
    FamilyContext.js                         # MODIFY — add meals, lists, notes, countdowns, photos state
  layouts/
    family-calendar/index.js                # MODIFY — integrate sidebar, new visual style
    chores/index.js                         # CREATE — chore chart + list toggle
    meals/index.js                          # CREATE — weekly meal plan
    lists/index.js                          # CREATE — shared shopping/grocery lists
    rewards/index.js                        # MODIFY — visual style update
    family/index.js                         # MODIFY — visual style update
    settings/index.js                       # MODIFY — add weather, kiosk, photo settings
  lib/
    supabase.js                             # MODIFY — add CRUD for new tables
    weather.js                              # CREATE — weather API integration
```

---

## Phase 1: Foundation (Theme + Layout + Navigation)

> Must be completed first. All other phases depend on this.

### Task 1: Update Theme — Warm & Bold Palette

**Files:**
- Modify: `src/assets/theme/index.js`

- [ ] **Step 1: Update light mode palette in `getPalette()`**

Change the light mode branch:
```js
// Light mode — Warm & Bold
: {
    main: "#6C5CE7", light: "#A29BFE", dark: "#5A4BD1", contrastText: "#fff"
  }
// secondary
: { main: "#00B894", light: "#55EFC4", dark: "#00A381", contrastText: "#fff" }
// error
error: { main: "#E17055", light: "#FAB1A0", dark: "#C0392B", contrastText: "#fff" },
// warning
warning: { main: "#FDCB6E", light: "#FFEAA7", dark: "#E1B54A", contrastText: "#000" },
// info
: { main: "#0984E3", light: "#74B9FF", dark: "#0767B5", contrastText: "#fff" }
// background
background: { default: "transparent", paper: "#ffffff" }
// text
text: { primary: "#1A1A1A", secondary: "#8B8680", disabled: "rgba(0,0,0,0.3)" }
// divider
divider: "rgba(0,0,0,0.04)"
// action
action: {
  hover: "rgba(0,0,0,0.03)",
  selected: "rgba(108,92,231,0.12)",
  focus: "rgba(108,92,231,0.2)",
}
```

- [ ] **Step 2: Update MEMBER_COLORS in FamilyContext.js**

```js
const MEMBER_COLORS = [
  { name: "Purple", value: "#6C5CE7", gradient: "primary" },
  { name: "Coral", value: "#E17055", gradient: "error" },
  { name: "Green", value: "#00B894", gradient: "success" },
  { name: "Gold", value: "#FDCB6E", gradient: "warning" },
  { name: "Blue", value: "#0984E3", gradient: "info" },
  { name: "Cyan", value: "#06b6d4", gradient: "secondary" },
  { name: "Pink", value: "#ec4899", gradient: "error" },
  { name: "Teal", value: "#14b8a6", gradient: "success" },
];
```

- [ ] **Step 3: Update AnimatedBackground light mode gradient**

In `src/components/AnimatedBackground/index.js`, change the light mode gradient:
```js
// Light mode: cream-to-white (Warm & Bold)
background: "linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 50%, #FFFFFF 100%)"
```

- [ ] **Step 4: Update button gradient in theme getComponents()**

Change the light mode accent gradient from teal to purple:
```js
// Contained button gradient — light mode
background: "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)"
// Button shadow — light mode
boxShadow: "0 4px 15px rgba(108,92,231,0.3)"
```

- [ ] **Step 5: Verify — run dev server and check visual changes**

```bash
npm start
```
Expected: App loads with purple accent, cream background, new member colors. Dark mode unchanged.

- [ ] **Step 6: Commit**
```bash
git add src/assets/theme/index.js src/context/FamilyContext.js src/components/AnimatedBackground/index.js
git commit -m "feat: Warm & Bold theme — purple accent, cream background, new member colors"
```

---

### Task 2: Create HeaderBar Component

**Files:**
- Create: `src/components/HeaderBar/index.js`

- [ ] **Step 1: Create HeaderBar component**

```jsx
// src/components/HeaderBar/index.js
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useThemeMode } from "context/ThemeContext";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function HeaderBar({ weather, topCountdown, members }) {
  const theme = useTheme();
  const { darkMode } = useThemeMode();
  const isMobile = useMediaQuery("(max-width:767px)");
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: { xs: 2, sm: 3 },
        py: 1.5,
        background: darkMode ? "rgba(10,10,26,0.95)" : "#ffffff",
        backdropFilter: darkMode ? "blur(20px)" : "none",
        borderBottom: `1px solid ${theme.palette.divider}`,
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left: Date */}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: isMobile ? "1.2rem" : "1.6rem",
            letterSpacing: "-0.03em",
            color: "text.primary",
          }}
        >
          {dayName}, {month} {date}
        </Typography>
      </Box>

      {/* Right: Widgets */}
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
        {/* Weather slot */}
        {weather && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #FFA726, #FF7043)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon sx={{ color: "#fff", fontSize: "1.1rem" }}>{weather.icon || "wb_sunny"}</Icon>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.2 }}>
                {weather.temp}°F
              </Typography>
              {!isMobile && (
                <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.2 }}>
                  {weather.condition}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Countdown pill */}
        {topCountdown && !isMobile && (
          <Box
            sx={{
              px: 1.75,
              py: 0.75,
              background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <Icon sx={{ fontSize: "0.9rem", color: "primary.main" }}>
              {topCountdown.icon || "celebration"}
            </Icon>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "primary.main" }}>
              {topCountdown.title}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              {topCountdown.daysLeft}d
            </Typography>
          </Box>
        )}

        {/* Family avatars */}
        {members && members.length > 0 && !isMobile && (
          <Box sx={{ display: "flex", ml: 0.5 }}>
            {members.slice(0, 4).map((m, i) => (
              <Box
                key={m.id}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: m.avatar_color || "#6C5CE7",
                  border: "2px solid",
                  borderColor: darkMode ? "rgba(10,10,26,0.95)" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: m.avatar_color === "#FDCB6E" ? "#1a1a1a" : "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  ml: i > 0 ? "-6px" : 0,
                  zIndex: 4 - i,
                  overflow: "hidden",
                }}
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={m.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  m.name?.charAt(0)
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Clock */}
        <Typography
          sx={{
            fontFamily: '"Inter", monospace',
            fontSize: isMobile ? "1.1rem" : "1.3rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "text.primary",
          }}
        >
          {hour12}:{minutes}{" "}
          <Typography
            component="span"
            sx={{ fontSize: "0.7rem", fontWeight: 500, color: "text.secondary" }}
          >
            {ampm}
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}

export default memo(HeaderBar);
```

- [ ] **Step 2: Verify render — import in App.js temporarily**

Add `import HeaderBar from "components/HeaderBar";` and render `<HeaderBar />` above Routes. Check it renders date and clock.

- [ ] **Step 3: Commit**
```bash
git add src/components/HeaderBar/index.js
git commit -m "feat: HeaderBar component — date, weather, countdown, avatars, clock"
```

---

### Task 3: Create TabStrip Component

**Files:**
- Create: `src/components/TabStrip/index.js`

- [ ] **Step 1: Create TabStrip component**

```jsx
// src/components/TabStrip/index.js
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import { useThemeMode } from "context/ThemeContext";

const TABS = [
  { key: "calendar", label: "Calendar", icon: "calendar_today", path: "/calendar" },
  { key: "chores", label: "Chores", icon: "task_alt", path: "/chores" },
  { key: "meals", label: "Meals", icon: "restaurant", path: "/meals" },
  { key: "lists", label: "Lists", icon: "checklist", path: "/lists" },
  { key: "rewards", label: "Rewards", icon: "emoji_events", path: "/rewards" },
  { key: "family", label: "Family", icon: "group", path: "/family" },
  { key: "settings", label: "", icon: "settings", path: "/settings" },
];

function TabStrip({ activeTab, onTabChange, rightSlot }) {
  const theme = useTheme();
  const { darkMode } = useThemeMode();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: { xs: 2, sm: 3 },
        py: 1,
        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: "4px",
          p: "6px",
          background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          borderRadius: "14px",
          flex: 1,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Box
              key={tab.key}
              onClick={() => onTabChange(tab.key, tab.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 2,
                py: 1,
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                userSelect: "none",
                touchAction: "manipulation",
                ...(isActive
                  ? {
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      color: "#fff",
                      fontWeight: 700,
                      boxShadow: "0 3px 10px rgba(108,92,231,0.25)",
                    }
                  : {
                      color: darkMode ? "rgba(255,255,255,0.4)" : "#8B8680",
                      "&:hover": {
                        background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      },
                    }),
              }}
            >
              <Icon sx={{ fontSize: "1rem" }}>{tab.icon}</Icon>
              {tab.label && (
                <Typography sx={{ fontSize: "0.8rem", fontWeight: isActive ? 700 : 500 }}>
                  {tab.label}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Right slot for view toggles */}
      {rightSlot && <Box sx={{ ml: "auto" }}>{rightSlot}</Box>}
    </Box>
  );
}

export { TABS };
export default memo(TabStrip);
```

- [ ] **Step 2: Commit**
```bash
git add src/components/TabStrip/index.js
git commit -m "feat: TabStrip component — top navigation for desktop/tablet"
```

---

### Task 4: Update App.js — Integrate HeaderBar + TabStrip + New Routes

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: Add imports for new components and pages**

Add at top of App.js:
```js
import HeaderBar from "components/HeaderBar";
import TabStrip from "components/TabStrip";
import Chores from "layouts/chores";
import Meals from "layouts/meals";
import Lists from "layouts/lists";
```

Note: Chores/Meals/Lists pages don't exist yet — create placeholder files first:
```jsx
// src/layouts/chores/index.js
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
export default function Chores() {
  return <Box p={3}><Typography variant="h4">Chores — Coming Soon</Typography></Box>;
}

// src/layouts/meals/index.js
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
export default function Meals() {
  return <Box p={3}><Typography variant="h4">Meals — Coming Soon</Typography></Box>;
}

// src/layouts/lists/index.js
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
export default function Lists() {
  return <Box p={3}><Typography variant="h4">Lists — Coming Soon</Typography></Box>;
}
```

- [ ] **Step 2: Replace layout in main app render**

In the main app component, replace the current layout (FloatingNav at bottom, pages) with:
1. `HeaderBar` at top (sticky)
2. `TabStrip` below header (hidden on mobile via `display: { xs: "none", md: "flex" }`)
3. Content area with Routes
4. `FloatingNav` only on mobile (`display: { xs: "flex", md: "none" }`)

Use `useLocation()` to derive `activeTab` from current path.

- [ ] **Step 3: Add new Routes**

Add to the Routes block:
```jsx
<Route path="/chores" element={<PageTransition><Chores /></PageTransition>} />
<Route path="/meals" element={<PageTransition><Meals /></PageTransition>} />
<Route path="/lists" element={<PageTransition><Lists /></PageTransition>} />
```

Keep `/tasks` redirecting to `/chores`:
```jsx
<Route path="/tasks" element={<Navigate to="/chores" replace />} />
```

- [ ] **Step 4: Update FloatingNav for mobile — new tabs**

In `src/components/FloatingNav/index.js`, update the nav items array to include: Calendar, Chores, Meals, Lists, and a "More" dropdown (Rewards, Family, Settings).

- [ ] **Step 5: Verify — all tabs navigate correctly on desktop and mobile**

```bash
npm start
```
Expected: HeaderBar shows at top, TabStrip renders below, clicking tabs navigates. Mobile shows bottom nav.

- [ ] **Step 6: Commit**
```bash
git add src/App.js src/components/HeaderBar/index.js src/components/TabStrip/index.js src/components/FloatingNav/index.js src/layouts/chores/index.js src/layouts/meals/index.js src/layouts/lists/index.js
git commit -m "feat: new layout — HeaderBar, TabStrip, mobile nav, placeholder pages"
```

---

## Phase 2: Calendar Tab Enhancement + Smart Sidebar

> Depends on Phase 1. Sequential.

### Task 5: Create SmartSidebar Shell

**Files:**
- Create: `src/components/SmartSidebar/index.js`

- [ ] **Step 1: Create SmartSidebar container component**

The sidebar renders on the calendar tab only. Contains 4 widget slots (Notes, Countdowns, Chores, Dinner). On desktop: right panel (280px). On tablet portrait: MUI Drawer as bottom sheet. On mobile: hidden (content in "Today" tab).

Key props: `notes`, `countdowns`, `todayChores`, `tonightDinner`, `onToggleChore`, `onAddNote`

Includes a collapse toggle (chevron icon) that persists state to localStorage key `famcal_sidebar_collapsed`.

- [ ] **Step 2: Integrate into family-calendar layout**

In `src/layouts/family-calendar/index.js`, wrap the calendar content in a flex container. Calendar takes `flex: 1`, SmartSidebar takes `width: 280px` on desktop.

- [ ] **Step 3: Commit**
```bash
git add src/components/SmartSidebar/index.js src/layouts/family-calendar/index.js
git commit -m "feat: SmartSidebar shell — collapsible right panel on calendar tab"
```

---

### Task 6: Update Calendar Visual Style

**Files:**
- Modify: `src/layouts/family-calendar/index.js`
- Modify: `src/assets/theme/index.js` (FullCalendar CSS overrides)

- [ ] **Step 1: Update day view event card styling**

Change event blocks to use color-tinted fills with 4px left border:
```js
// Event card style
background: `rgba(${memberColorRGB}, 0.1)`,
borderLeft: `4px solid ${memberColor}`,
borderRadius: "10px",
padding: "10px 14px",
```

- [ ] **Step 2: Update header date display to use HeaderBar (remove inline date nav)**

Remove the inline date navigation from the calendar page — the date is now in HeaderBar. Keep prev/next day chevrons as an inline control near the view toggle.

- [ ] **Step 3: Update FullCalendar CSS in theme for new color scheme**

In the FullCalendar global CSS overrides within the theme file, update:
- Today background: `rgba(108,92,231,0.06)` (light) / `rgba(108,92,231,0.08)` (dark)
- Today number pill: purple gradient `linear-gradient(135deg, #6C5CE7, #A29BFE)`
- Event class colors to match new Warm & Bold palette

- [ ] **Step 4: Update "family event" style to dashed border**

Events assigned to "everyone" or with no specific member use dashed left border:
```js
borderLeft: `4px dashed rgba(108,92,231,0.3)`,
border: "1px dashed rgba(108,92,231,0.15)",
```

- [ ] **Step 5: Verify — calendar looks correct in both day and month views**

- [ ] **Step 6: Commit**
```bash
git add src/layouts/family-calendar/index.js src/assets/theme/index.js
git commit -m "feat: calendar Warm & Bold visual update — tinted event cards, purple accents"
```

---

### Task 7: Update Existing Pages Visual Style (Rewards, Family, Settings)

**Files:**
- Modify: `src/layouts/rewards/index.js`
- Modify: `src/layouts/family/index.js`
- Modify: `src/layouts/settings/index.js`

- [ ] **Step 1: Update Rewards page accent colors**

Replace teal accents with purple gradient. Update leaderboard rank colors. Update reward card icon backgrounds.

- [ ] **Step 2: Update Family page accent colors**

Replace teal accents with purple gradient. Update level badge colors. Update action button colors.

- [ ] **Step 3: Update Settings page — add sections for new features**

Add new settings sections (as placeholders initially):
- Weather: location input field
- Kiosk Mode: toggle + idle timeout slider + font scale
- Photo Frame: toggle, interval, upload area (placeholder)

These are UI shells — the actual logic comes in later phases.

- [ ] **Step 4: Commit**
```bash
git add src/layouts/rewards/index.js src/layouts/family/index.js src/layouts/settings/index.js
git commit -m "feat: Warm & Bold visual update for Rewards, Family, Settings pages"
```

---

## Phase 3a: State + Data Layer (Sequential)

> Must complete before Phase 3b. Modifies shared files that parallel agents would conflict on.

### Task 8: Extend FamilyContext + Supabase for ALL New Features

**Files:**
- Modify: `src/context/FamilyContext.js` (add ALL new state — meals, lists, notes, countdowns, photos)
- Modify: `src/lib/supabase.js` (add ALL new CRUD functions)
- Create: `src/lib/weather.js`

- [ ] **Step 1: Add all new state fields to FamilyContext initial state**

```js
// Add to initial state alongside existing fields
meals: [],
lists: [],
notes: [],
countdowns: [],
photos: [],
weather: null,
loading: { meals: false, lists: false, notes: false, countdowns: false, photos: false, weather: false },
```

- [ ] **Step 2: Add all new reducer cases**

Add all reducer cases for: SET_MEALS, ADD_MEAL, UPDATE_MEAL, REMOVE_MEAL, SET_LISTS, ADD_LIST, REMOVE_LIST, ADD_LIST_ITEM, TOGGLE_LIST_ITEM, REMOVE_LIST_ITEM, SET_NOTES, ADD_NOTE, UPDATE_NOTE, REMOVE_NOTE, SET_COUNTDOWNS, ADD_COUNTDOWN, REMOVE_COUNTDOWN, SET_PHOTOS, ADD_PHOTO, REMOVE_PHOTO, SET_WEATHER, SET_KIOSK_MODE.

- [ ] **Step 3: Add all Supabase CRUD functions to supabase.js**

Add fetch/create/update/delete functions for: meals, lists, list_items, notes, countdowns, photos (including Supabase Storage helpers for photos).

- [ ] **Step 4: Create weather.js utility**

Weather API helper with caching (as defined in Task 11).

- [ ] **Step 5: Commit**
```bash
git add src/context/FamilyContext.js src/lib/supabase.js src/lib/weather.js
git commit -m "feat: extend state + data layer for all v3 features (meals, lists, notes, countdowns, photos, weather)"
```

---

## Phase 3b: New Tabs (PARALLEL — 3 agents)

> All 3 tasks can run in parallel. Each depends on Phase 3a (state layer). Each agent creates ONLY new files — no modifications to shared files.

### Task 9: Chores Tab (Full Implementation)

**Files:**
- Create: `src/components/ChoreGrid/index.js`
- Modify: `src/layouts/chores/index.js` (replace placeholder)
- Modify: `src/context/FamilyContext.js` (no new state — reuses tasks)

- [ ] **Step 1: Create ChoreGrid component**

Visual grid component. Props: `tasks`, `members`, `weekStart`, `onToggleComplete`, `onAddTask`.

Layout: rows = recurring tasks (filtered), columns = Mon-Sun. Each cell shows checkmark/empty/missed. Current day highlighted with `rgba(108,92,231,0.06)` background.

- [ ] **Step 2: Implement chores layout page**

Replace placeholder with full page:
- Stats cards row (reuse from current Tasks page)
- Grid/List view toggle (state in component, default: grid)
- Grid view: `<ChoreGrid />` for recurring tasks
- List view: Existing task list with updated visual style
- Week navigation (prev/next)
- FAB for add task (same dialog as current)
- Filter by member

- [ ] **Step 3: Wire up task completion in grid**

Tapping a cell dispatches `COMPLETE_TASK` action (same as current). Points awarded. Cell shows checkmark with green background.

- [ ] **Step 4: Verify — grid renders, completion works, points awarded**

- [ ] **Step 5: Commit**
```bash
git add src/components/ChoreGrid/index.js src/layouts/chores/index.js
git commit -m "feat: Chores tab — visual chore grid with completion and gamification"
```

---

### Task 10: Meals Tab (Parallel Agent 2)

**Files:**
- Create: `src/components/MealGrid/index.js`
- Modify: `src/layouts/meals/index.js` (replace placeholder)
- Note: FamilyContext + Supabase already extended in Task 8. Do NOT modify FamilyContext.js or supabase.js.

- [ ] **Step 1: Create MealGrid component**

Visual grid. Rows = days (Mon-Sun). Columns = Breakfast, Lunch, Dinner, Snack. Each cell is tappable — opens inline edit (small text input) or dialog. Current day row highlighted.

- [ ] **Step 2: Implement meals layout page**

Full page:
- Week label + prev/next navigation
- `<MealGrid />` component
- "Copy Last Week" button
- "Add to Grocery List" button per meal: opens dialog with pre-filled title, user edits/confirms items to add to default "Groceries" list
- Tonight's dinner highlight (dinner cell for today gets accent border)

- [ ] **Step 3: Load meals on mount — fetch from Supabase for current week**

In the Meals component, `useEffect` fetches meals for the displayed week. Dispatch `SET_MEALS`.

- [ ] **Step 4: Implement "Add to Grocery List" dialog**

When user taps "Add to Grocery List" on a meal:
1. Open a dialog pre-filled with the meal title as a text item
2. User can edit text, add multiple lines (one item per line), pick the target list (default: "Groceries")
3. On confirm, each line becomes a new list item via `dispatch({ type: "ADD_LIST_ITEM", value: { listId, item } })`
4. Auto-categorize each item using the keyword dictionary (from Task 11)

- [ ] **Step 5: Verify — grid renders, meals save, week navigation works, grocery dialog works**

- [ ] **Step 6: Commit**
```bash
git add src/components/MealGrid/index.js src/layouts/meals/index.js src/context/FamilyContext.js src/lib/supabase.js
git commit -m "feat: Meals tab — weekly meal plan grid with Supabase persistence"
```

---

### Task 11: Lists Tab (Parallel Agent 3)

**Files:**
- Modify: `src/layouts/lists/index.js` (replace placeholder)
- Note: FamilyContext + Supabase already extended in Task 8. Do NOT modify FamilyContext.js or supabase.js.

- [ ] **Step 1: Implement lists layout page**

Full page:
- Sub-tab bar: list names (Groceries, Shopping, custom) + "+" button to create new list
- Active list items with category headers (Produce, Dairy, Meat, Pantry, Frozen, Other)
- Each item: checkbox + text + "added by" member dot
- Text input at bottom to add items
- "Clear completed" button
- Items sort: unchecked first, then checked (strikethrough, dimmed)
- Swipe-to-delete on items (or delete icon)

- [ ] **Step 4: Auto-categorize grocery items**

Simple keyword dictionary for auto-categorization:
```js
const GROCERY_CATEGORIES = {
  Produce: ["apple", "banana", "lettuce", "tomato", "onion", "potato", "avocado", "spinach", "carrot", "berry", "fruit", "vegetable"],
  Dairy: ["milk", "cheese", "yogurt", "butter", "cream", "egg"],
  Meat: ["chicken", "beef", "pork", "fish", "salmon", "turkey", "shrimp"],
  Pantry: ["rice", "pasta", "bread", "flour", "sugar", "oil", "sauce", "cereal", "can"],
  Frozen: ["frozen", "ice cream", "pizza"],
};
function categorizeItem(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(GROCERY_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return "Other";
}
```

- [ ] **Step 5: Seed default "Groceries" list on first load**

If `lists` is empty after Supabase fetch, create a default "Groceries" list.

- [ ] **Step 6: Verify — lists render, items add/check/delete, categories work**

- [ ] **Step 7: Commit**
```bash
git add src/layouts/lists/index.js src/context/FamilyContext.js src/lib/supabase.js
git commit -m "feat: Lists tab — shared grocery/shopping lists with categorization"
```

---

## Phase 4a: Widget Slots Prep (Sequential)

> Must complete before Phase 4b. Prepares shared files so parallel widget agents don't conflict.

### Task 12: Prepare Widget Slots in HeaderBar + SmartSidebar

**Files:**
- Modify: `src/components/HeaderBar/index.js` (add weather + countdown props/slots)
- Modify: `src/components/SmartSidebar/index.js` (add widget section slots with prop-based rendering)

- [ ] **Step 1: Update HeaderBar to accept and render widget props**

Add props: `weather` (object), `topCountdown` (object). These are already in the HeaderBar code from Task 2 — verify they render correctly when data is passed vs when null (graceful fallback).

- [ ] **Step 2: Update SmartSidebar to render widget sections from props**

SmartSidebar accepts: `notesWidget`, `countdownWidget`, `todayChoresWidget`, `tonightDinnerWidget` — each is a React node rendered in its section slot. This way, widget components are created independently and slotted in during Phase 6 integration.

- [ ] **Step 3: Commit**
```bash
git add src/components/HeaderBar/index.js src/components/SmartSidebar/index.js
git commit -m "feat: prepare widget slots in HeaderBar + SmartSidebar for parallel widget development"
```

---

## Phase 4b: Widgets (PARALLEL — 3 agents)

> All 3 create only NEW files. Shared files (HeaderBar, SmartSidebar) already have slots from Task 12. Integration happens in Phase 6.

### Task 13: Weather Widget

**Files:**
- Create: `src/components/WeatherWidget/index.js`
- Note: `src/lib/weather.js` already created in Task 8. HeaderBar slot already prepared in Task 12.

- [ ] **Step 1: Create WeatherWidget component**

A self-contained component that fetches weather data and renders two variants:
- `variant="header"`: compact pill for HeaderBar
- `variant="sidebar"`: full card with 3-day forecast for SmartSidebar

Uses `fetchWeather()` from `src/lib/weather.js` (created in Task 8). Renders loading placeholder for first 3 seconds.

```js
// src/components/WeatherWidget/index.js — uses this helper from src/lib/weather.js:
// src/lib/weather.js (already created in Task 8)
const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const CACHE_KEY = "famcal_weather_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const ICON_MAP = {
  "01d": "wb_sunny", "01n": "nights_stay",
  "02d": "partly_cloudy_day", "02n": "nights_stay",
  "03d": "cloud", "03n": "cloud",
  "04d": "cloud", "04n": "cloud",
  "09d": "water_drop", "09n": "water_drop",
  "10d": "rainy", "10n": "rainy",
  "11d": "thunderstorm", "11n": "thunderstorm",
  "13d": "ac_unit", "13n": "ac_unit",
  "50d": "foggy", "50n": "foggy",
};

export async function fetchWeather(location) {
  if (!API_KEY || !location) return null;

  // Check cache
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) return data;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=imperial&appid=${API_KEY}`
    );
    if (!res.ok) return null;
    const json = await res.json();

    const weather = {
      temp: Math.round(json.main.temp),
      condition: json.weather[0]?.main || "",
      icon: ICON_MAP[json.weather[0]?.icon] || "wb_sunny",
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: weather, timestamp: Date.now() }));
    return weather;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create WeatherWidget component for sidebar (3-day forecast)**

Sidebar version shows current conditions + 3-day forecast. Uses OpenWeatherMap 5-day forecast endpoint for future days.

- [ ] **Step 3: Wire weather into HeaderBar and SmartSidebar**

In App.js or FamilyCalendar layout, call `fetchWeather()` on mount, pass result to HeaderBar and SmartSidebar.

- [ ] **Step 4: Add weather location to Settings**

In Settings page, add a text field for city name. Save to `families.weather_location` in Supabase and localStorage.

- [ ] **Step 5: Commit**
```bash
git add src/lib/weather.js src/components/WeatherWidget/index.js src/components/HeaderBar/index.js src/components/SmartSidebar/index.js src/layouts/settings/index.js
git commit -m "feat: Weather widget — header pill + sidebar forecast via OpenWeatherMap"
```

---

### Task 14: Countdown Widget

**Files:**
- Create: `src/components/CountdownWidget/index.js`
- Note: FamilyContext + Supabase already extended in Task 8. HeaderBar/SmartSidebar slots prepared in Task 12. Do NOT modify shared files.

- [ ] **Step 1: Create CountdownWidget component**

Sidebar version: list of all active countdowns with bold day count. Each shows title, days remaining, colored icon.

- [ ] **Step 2: Implement birthday auto-generation**

On app load, check each member's `birth_date`. If birthday is within 90 days and no countdown exists for it this year, create one with `auto_generated: true`, member's color, and "cake" icon. After birthday passes, soft-delete (hide). Next year, auto-create again.

- [ ] **Step 3: Add "Pin as Countdown" button to event detail dialog**

In the calendar event edit dialog, add a small "Pin" icon button that creates a countdown from that event.

- [ ] **Step 7: Commit**
```bash
git add src/components/CountdownWidget/index.js src/context/FamilyContext.js src/lib/supabase.js src/components/HeaderBar/index.js src/components/SmartSidebar/index.js
git commit -m "feat: Countdown widget — auto-birthday, manual pin, header pill + sidebar list"
```

---

### Task 15: Family Notes Widget

**Files:**
- Create: `src/components/NotesWidget/index.js`
- Note: FamilyContext + Supabase already extended in Task 8. SmartSidebar slot prepared in Task 12. Do NOT modify shared files.

- [ ] **Step 1: Create NotesWidget component**

Sidebar display:
- "Notes" header with "+" add button
- Stacked note cards, color-coded by member (left border = member color)
- Each: text, member name, time ago, pin icon
- Tap note to edit/delete (small popover or dialog)
- Pin toggle (pinned notes show pin icon, stay at top)
- Add flow: small inline form (text input + member dropdown) or compact dialog

- [ ] **Step 4: Implement auto-expire logic**

Notes without `pinned: true` that are older than 24h are filtered out of display. Optionally clean up from Supabase on app load.

- [ ] **Step 5: Wire into SmartSidebar as first widget section**

- [ ] **Step 6: Commit**
```bash
git add src/components/NotesWidget/index.js src/context/FamilyContext.js src/lib/supabase.js src/components/SmartSidebar/index.js
git commit -m "feat: Family Notes widget — color-coded notes with pin/expire in sidebar"
```

---

## Phase 5: Overlay Features (PARALLEL — 2 agents)

> Both can run in parallel. Depend on Phase 1 only.

### Task 16: Photo Frame Mode

**Files:**
- Create: `src/components/PhotoFrame/index.js`
- Modify: `src/context/FamilyContext.js` (add photos state)
- Modify: `src/lib/supabase.js` (photos CRUD + storage)
- Modify: `src/layouts/settings/index.js` (photo upload UI)
- Modify: `src/App.js` (render PhotoFrame overlay)

- [ ] **Step 1: Add photos state to FamilyContext**

Add `photos: []` to initial state. Add `SET_PHOTOS`, `ADD_PHOTO`, `REMOVE_PHOTO` to reducer.

- [ ] **Step 2: Add Supabase Storage helpers for photos**

```js
// In supabase.js
export async function uploadPhoto(familyId, file) {
  const path = `family-photos/${familyId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("photos").upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
  return { storage_path: path, url: urlData.publicUrl };
}
export async function deletePhoto(storagePath) {
  await supabase.storage.from("photos").remove([storagePath]);
}
export async function fetchPhotos(familyId) {
  const { data } = await supabase.from("photos").select("*").eq("family_id", familyId).order("sort_order");
  return (data || []).map(p => ({
    ...p,
    url: supabase.storage.from("photos").getPublicUrl(p.storage_path).data.publicUrl,
  }));
}
```

- [ ] **Step 3: Create PhotoFrame component**

Fullscreen overlay (z-index: 9999). Shows photos with crossfade transition (CSS opacity animation). Small clock + weather overlay in bottom-right (10% opacity background). Tap anywhere to dismiss.

Props: `photos`, `interval` (seconds), `weather`, `onDismiss`.

Client-side image compression before upload: use canvas to resize to max 1920x1080 and convert to JPEG.

- [ ] **Step 4: Add idle detection in App.js**

Track last interaction time. When idle for `idle_timeout` seconds (from Settings), activate PhotoFrame overlay. Reset timer on pointer/touch/keyboard events. Pause timer when Page Visibility API reports hidden.

- [ ] **Step 5: Add photo management to Settings**

In Settings page photo section:
- Drag-drop upload area (accepts JPEG, PNG, WebP, max 5MB)
- Grid of uploaded photos with delete button
- Slideshow interval dropdown
- Photo count indicator (X/100)

- [ ] **Step 6: Verify — upload photos, idle triggers slideshow, tap dismisses**

- [ ] **Step 7: Commit**
```bash
git add src/components/PhotoFrame/index.js src/context/FamilyContext.js src/lib/supabase.js src/layouts/settings/index.js src/App.js
git commit -m "feat: Photo Frame — idle-triggered fullscreen slideshow with upload management"
```

---

### Task 17: Kiosk Mode

**Files:**
- Create: `src/components/KioskWrapper/index.js`
- Modify: `src/App.js` (wrap content in KioskWrapper)
- Modify: `src/layouts/settings/index.js` (kiosk settings)

- [ ] **Step 1: Create KioskWrapper component**

Wraps the entire app content. When kiosk mode is enabled (from Settings/localStorage):
1. Requests Fullscreen API on mount (with fallback banner for iOS)
2. Acquires Wake Lock (with fallback warning)
3. Scales root font-size based on `font_scale` setting
4. Auto-hides TabStrip after 5s inactivity (CSS opacity transition)
5. Shows "tap top edge" indicator briefly on hide
6. Renders "Exit Kiosk Mode" button (always visible in top-right corner, small)

- [ ] **Step 2: Wire idle detection to kiosk mode**

Kiosk mode's idle detection triggers PhotoFrame. Reuses the same idle timer from Task 16, but kiosk mode may have different timeout settings. Create a shared `useIdleTimer` hook in `src/hooks/useIdleTimer.js` that both PhotoFrame and KioskWrapper consume.

- [ ] **Step 3: Add kiosk settings in Settings page**

- Toggle: "Kiosk Mode"
- Slider: Idle timeout (1-30 min)
- Slider: Font scale (100%-150%)
- Info text about Fullscreen and Wake Lock browser support

- [ ] **Step 4: Verify — enable kiosk, tabs auto-hide, fullscreen works, exit button works**

- [ ] **Step 5: Commit**
```bash
git add src/components/KioskWrapper/index.js src/App.js src/layouts/settings/index.js
git commit -m "feat: Kiosk mode — fullscreen, wake lock, auto-hide tabs, font scaling"
```

---

## Phase 6: Integration & Polish

> Sequential. Depends on all previous phases.

### Task 18: Wire SmartSidebar Widgets Together

**Files:**
- Modify: `src/layouts/family-calendar/index.js`
- Modify: `src/components/SmartSidebar/index.js`

- [ ] **Step 1: Connect sidebar widgets to live data**

In the FamilyCalendar layout:
- Pass `notes` from FamilyContext to SmartSidebar → NotesWidget
- Pass `countdowns` (filtered for future) to SmartSidebar → CountdownWidget
- Pass today's tasks (filtered) to SmartSidebar → today's chores widget
- Pass today's dinner meal (from meals state) to SmartSidebar → tonight's dinner widget

- [ ] **Step 2: Add "Tonight's Dinner" mini-widget to sidebar**

Simple display: meal title + description from today's dinner entry. If no dinner planned, show "No dinner planned" with link to Meals tab.

- [ ] **Step 3: Add "Today's Chores" mini-widget to sidebar**

Show today's tasks as a compact checklist. Tap to complete (dispatches same action as Chores tab). Shows completion count "X/Y done".

- [ ] **Step 4: Verify — all sidebar widgets show live data, updates reflect immediately**

- [ ] **Step 5: Commit**
```bash
git add src/layouts/family-calendar/index.js src/components/SmartSidebar/index.js
git commit -m "feat: wire sidebar widgets — live notes, countdowns, chores, dinner"
```

---

### Task 19: Supabase Migration Script + Data Loading

**Files:**
- Create: `supabase/migrations/001_v3_tables.sql`
- Modify: `src/context/FamilyContext.js` (load new data on mount)

- [ ] **Step 1: Create migration SQL file**

Combine all `CREATE TABLE` and `ALTER TABLE` statements from the spec into a single migration file. Include the default Groceries list seed.

- [ ] **Step 2: Add data loading to FamilyProvider**

In the `useEffect` that runs on mount (after Supabase connection check), add parallel fetches for new tables:
```js
const [meals, lists, notes, countdowns, photos] = await Promise.all([
  fetchMeals(family.id, weekStart, weekEnd),
  fetchLists(family.id),
  fetchNotes(family.id),
  fetchCountdowns(family.id),
  fetchPhotos(family.id),
]);
dispatch({ type: "SET_MEALS", value: meals });
dispatch({ type: "SET_LISTS", value: lists });
// ... etc
```

- [ ] **Step 3: Run migration against Supabase**

```bash
# Apply via Supabase dashboard SQL editor or CLI
```

- [ ] **Step 4: Verify — fresh app load populates all new state from Supabase**

- [ ] **Step 5: Commit**
```bash
git add supabase/migrations/001_v3_tables.sql src/context/FamilyContext.js
git commit -m "feat: Supabase migration + parallel data loading for v3 tables"
```

---

### Task 20: Final Polish, Responsive Testing & Smoke Test

**Files:**
- Various component files

- [ ] **Step 1: Dark mode verification**

Toggle dark mode and verify ALL new components render correctly:
- HeaderBar uses glassmorphism
- TabStrip uses dark colors
- ChoreGrid cells use correct dark backgrounds
- MealGrid cells use correct dark backgrounds
- Lists items use correct dark backgrounds
- Notes use glassmorphism
- CountdownWidget uses correct backgrounds
- PhotoFrame overlay works in dark mode

- [ ] **Step 2: Mobile responsive verification**

Test at 375px (iPhone):
- Bottom nav shows with correct tabs (Calendar, Chores, Meals, Lists, More)
- HeaderBar condenses (no countdown pill, no avatars)
- Sidebar hidden, "Today" tab available
- All dialogs go full-screen
- Touch targets minimum 44px

- [ ] **Step 3: Tablet portrait verification (768px)**

- Top tabs visible
- Sidebar collapsed to bottom sheet
- Bottom sheet opens on swipe up
- No content overflow

- [ ] **Step 4: Animation sweep**

Verify Framer Motion animations work on all new pages:
- Page transitions on tab switch
- Card entry animations on chores/meals/lists
- Sidebar expand/collapse animation
- PhotoFrame crossfade

- [ ] **Step 5: Final commit**
```bash
git add -A
git commit -m "feat: FamCal v3.0 — polish, responsive fixes, dark mode verification"
```

---

## Execution Summary

| Phase | Tasks | Agents | Est. Complexity |
|-------|-------|--------|-----------------|
| 1. Foundation | Tasks 1-4 | 1 (sequential) | Medium |
| 2. Calendar + Sidebar | Tasks 5-7 | 1 (sequential) | Medium |
| 3a. State Layer | Task 8 | 1 (sequential) | Medium |
| 3b. New Tabs | Tasks 9-11 | **3 parallel** | High |
| 4a. Widget Slots | Task 12 | 1 (sequential) | Low |
| 4b. Widgets | Tasks 13-15 | **3 parallel** | Medium |
| 5. Overlays | Tasks 16-17 | **2 parallel** | Medium |
| 6. Integration | Tasks 18-20 | 1 (sequential) | Medium |

**Total: 20 tasks across 8 sub-phases. Max parallelism: 3 agents in Phases 3b and 4b.**

**Parallelization safety:** Shared files (FamilyContext.js, supabase.js, HeaderBar, SmartSidebar) are ONLY modified in sequential prep tasks (8, 12). Parallel agents create only new files unique to their feature.

**Critical path:** Phase 1 → Phase 2 → Phase 4a → Phase 4b → Phase 6. Phases 3a/3b and 5 run alongside.

**Smoke test (Task 20):** Verify full flow: login → setup → calendar → chores → meals → lists → photo frame → kiosk mode.
