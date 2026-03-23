# Project Intelligence: FamCal (Family Calendar App)

> Last updated: 2026-03-22
> Last incremental update: 2026-03-22 (AI deep integration)
> Base template: Argon Dashboard 2 PRO MUI v3.0.1 by Creative Tim

## Overview

**FamCal** is a family calendar and task management app built on top of the Argon Dashboard 2 PRO MUI template. It provides a shared family calendar, gamified task system with points/levels/streaks, a rewards store, and family member management. Designed for wall-mounted displays and touch devices (Skylight-style).

**App name:** FamCal (branded in `App.js` Sidenav and `public/index.html` title)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | >=16.8.0 |
| UI Library | MUI (Material UI) | 5.13.1 |
| Styling | Emotion (`@emotion/react`, `@emotion/styled`) | 11.11.0 |
| Routing | React Router DOM | 6.11.1 |
| Calendar | FullCalendar (React, DayGrid, TimeGrid, Interaction) | 6.1.7 |
| Charts | Chart.js + react-chartjs-2 | 3.9.1 / 3.0.4 |
| Forms | Formik + Yup | 2.2.9 / 1.1.1 |
| Select | react-select | 5.7.3 |
| Date Picker | Flatpickr (react-flatpickr) | 3.10.13 |
| Backend/DB | Supabase (`@supabase/supabase-js`) | ^2.99.1 |
| Rich Text | Draft.js + react-draft-wysiwyg | 0.11.7 / 1.15.0 |
| Alerts | SweetAlert2 | 11.7.5 |
| Kanban | @asseinfo/react-kanban | 2.2.0 |
| Maps | Leaflet + react-leaflet | 1.9.3 / 4.2.1 |
| Build | Create React App (react-scripts) | 5.0.1 |
| TypeScript | **No** (plain JavaScript) |
| Linting | ESLint (react-app preset) + Prettier | 8.40.0 / 2.8.8 |
| RTL Support | stylis-plugin-rtl | 2.1.1 |

## Build & Development

### Scripts (from package.json)
```bash
npm start              # NODE_OPTIONS=--openssl-legacy-provider react-scripts start
npm run build          # NODE_OPTIONS=--openssl-legacy-provider react-scripts build
npm test               # react-scripts test
npm run install:clean  # rm -rf node_modules/ && package-lock.json && npm install && npm start
npm run install:peer-deps  # npm install --legacy-peer-deps
```

### Environment Variables
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co    # Supabase project URL
REACT_APP_SUPABASE_ANON_KEY=your-anon-key                   # Supabase anonymous key
```

### CDN Dependencies (loaded in `public/index.html`)
- Google Fonts: Open Sans (300,400,600,700)
- Google Material Icons (all variants: outlined, two-tone, round, sharp)
- Leaflet CSS (1.7.1)
- Nucleo Icons (CSS loaded from `assets/css/nucleo-icons.css`, `nucleo-svg.css`)

## Directory Structure

```
src/
  index.js                    # Entry point: BrowserRouter > ArgonControllerProvider > FamilyProvider > PerfectScrollbar > App
  App.js                      # Theme provider, routing, Sidenav, dark mode, RTL support
  routes.js                   # Route definitions (5 active routes)
  context/
    index.js                  # ArgonControllerProvider - UI state (sidenav, dark mode, direction, layout)
    FamilyContext.js           # FamilyProvider - domain state (family, members, tasks, events, rewards)
  lib/
    supabase.js               # Supabase client + database schema reference
  components/                 # Argon-prefixed MUI wrapper components (16 components)
    ArgonBox/                  # Styled MUI Box with custom props (variant, bgColor, shadow, etc.)
    ArgonTypography/           # Styled MUI Typography with custom props (color, fontWeight, etc.)
    ArgonButton/               # Styled MUI Button with gradient, outlined, text variants
    ArgonInput/                # Styled MUI InputBase wrapper
    ArgonSelect/               # react-select wrapper with Argon styling
    ArgonAvatar/               # Styled MUI Avatar
    ArgonBadge/                # Custom badge component
    ArgonBadgeDot/             # Dot-style badge
    ArgonAlert/                # Custom alert with close icon
    ArgonDatePicker/           # Flatpickr wrapper
    ArgonDropzone/             # Dropzone file upload wrapper
    ArgonEditor/               # Draft.js rich text editor wrapper
    ArgonPagination/           # Custom pagination
    ArgonProgress/             # Styled MUI LinearProgress
    ArgonSnackbar/             # Custom snackbar notification
    ArgonTagInput/             # Tag input component
    ArgonSocialButton/         # Social media styled button
  layouts/                    # Page-level components (active + template)
    family-calendar/index.js  # ** ACTIVE ** Main calendar page (day view + month view)
    tasks/index.js            # ** ACTIVE ** Task management with filters, stats, CRUD
    family/index.js           # ** ACTIVE ** Family member management, profiles, levels
    rewards/index.js          # ** ACTIVE ** Rewards store + leaderboard + gamification
    settings/index.js         # ** ACTIVE ** App settings, Supabase config, Google Calendar, display prefs
    dashboards/               # (Template) Default, CRM, Automotive, Smart Home, VR, Landing
    applications/             # (Template) Calendar, Wizard, DataTables, Kanban, Analytics
    ecommerce/                # (Template) Products, Orders, Overview, Referral
    pages/                    # (Template) Profile, Account, Projects, Pricing, Auth pages
  examples/                   # Reusable layout/widget components (NOT examples in the tutorial sense)
    Calendar/                 # EventCalendar - FullCalendar React wrapper with Argon theme
    Sidenav/                  # Sidebar navigation (collapsible, themed, dark/light)
    Navbars/DashboardNavbar/  # Top navbar with breadcrumbs, search, profile icons
    LayoutContainers/         # DashboardLayout, PageLayout wrapper components
    Configurator/             # Theme/UI settings panel
    Footer/                   # Footer component
    Tables/                   # DataTable, SalesTable, simple Table
    Cards/                    # 30+ card variants (Statistics, Info, Profile, Blog, Pricing, etc.)
    Charts/                   # Chart wrappers (Line, Bar, Doughnut, Pie, Polar, Radar, Bubble, Mixed)
    Lists/                    # ProfilesList, CategoriesList, RankingsList
    Timeline/                 # Timeline component
    Breadcrumbs/              # Breadcrumb navigation
  assets/
    theme/                    # Light theme
      index.js                # createTheme() composition
      theme-rtl.js            # RTL variant
      base/                   # colors, typography, globals, borders, breakpoints, boxShadows
      components/             # MUI component overrides (40+ components)
      functions/              # Utility functions (pxToRem, rgba, linearGradient, boxShadow, hexToRgb)
    theme-dark/               # Dark theme (mirrors theme/ structure)
    css/                      # Nucleo icon fonts
    images/                   # Static images
```

## Active Routes (from `routes.js`)

| Path | Component | Key | Icon | Description |
|------|-----------|-----|------|-------------|
| `/calendar` | `FamilyCalendar` | calendar | `ni-calendar-grid-58` | Main calendar with day strip + month view |
| `/tasks` | `Tasks` | tasks | `ni-check-bold` | Task list with filters, stats, CRUD |
| `/family` | `Family` | family | `ni-circle-08` | Family member management |
| `/rewards` | `Rewards` | rewards | `ni-trophy` | Leaderboard + rewards store |
| `/settings` | `Settings` | settings | `ni-settings-gear-65` | App configuration |
| `*` | → `/calendar` | — | — | Default redirect |

## State Management Architecture

### 1. ArgonController (`context/index.js`)
UI-level state via `useReducer`. Exposed through `useArgonController()` hook.

**State shape:**
```js
{ miniSidenav, darkSidenav, sidenavColor, transparentNavbar, fixedNavbar,
  openConfigurator, direction, layout, darkMode }
```

**Dispatch helpers:** `setMiniSidenav`, `setDarkSidenav`, `setSidenavColor`, `setTransparentNavbar`, `setFixedNavbar`, `setOpenConfigurator`, `setDirection`, `setLayout`, `setDarkMode`

### 2. FamilyContext (`context/FamilyContext.js`)
Domain-level state via `useReducer`. Exposed through `useFamilyController()` hook.

**State shape:**
```js
{ family, members, tasks, events, rewards, selectedMembers, isSupabaseConnected, loading }
```

**Actions:** `SET_FAMILY`, `SET_MEMBERS`, `ADD_MEMBER`, `UPDATE_MEMBER`, `REMOVE_MEMBER`, `TOGGLE_MEMBER_VISIBILITY`, `SET_TASKS`, `ADD_TASK`, `UPDATE_TASK`, `COMPLETE_TASK`, `REMOVE_TASK`, `SET_EVENTS`, `ADD_EVENT`, `UPDATE_EVENT`, `REMOVE_EVENT`, `ADD_REWARD`, `CLAIM_REWARD`, `SET_SUPABASE_CONNECTED`, `SET_LOADING`

**Exported constants:** `MEMBER_COLORS` (8 colors), `MEMBER_EMOJIS` (10 emojis), `TASK_CATEGORIES` (7 categories: chores, homework, errands, health, cooking, pets, other)

### Gamification Model
- **Points:** Earned by completing tasks (each task has `points_value`)
- **Levels:** `Math.floor(points / 100) + 1` — titles from Beginner to Supreme
- **Streaks:** `streak_days` tracked per member
- **Rewards:** Claimable items costing points (deducted from member's balance)

## Data Models

### Family
```js
{ id, name }
```

### Member
```js
{ id, family_id, name, avatar_color, avatar_emoji, google_calendar_id,
  points, level, streak_days, visible }
```

### Task
```js
{ id, family_id, title, description, assigned_to, due_date, due_time,
  recurring, recurring_pattern, points_value, completed, completed_at,
  completed_by, category, priority }
```

### Event
```js
{ id, family_id, member_id, title, start, end, allDay, className, source }
```

### Reward
```js
{ id, family_id, title, description, points_cost, icon }
```

## Supabase Integration

**Client:** `src/lib/supabase.js` — initialized from env vars, falls back to placeholder URL.

**Status check:** On mount, `FamilyProvider` pings `families` table. If successful, sets `isSupabaseConnected: true`. Otherwise, the app runs entirely with in-memory state (demo data).

**Database schema:** Full SQL provided in Settings page. Tables: `families`, `family_members`, `tasks`, `events`, `rewards`. All have RLS enabled.

**Current state:** Supabase connection is optional. The app works fully offline with hardcoded demo data. No actual Supabase CRUD operations are implemented yet — only the connection check.

## Component Patterns

### Layout Pattern
Every active page follows this structure:
```jsx
<DashboardLayout>
  <DashboardNavbar />
  <ArgonBox py={2-3}>
    {/* Page content */}
  </ArgonBox>
</DashboardLayout>
```

### Argon Component Usage
- **`ArgonBox`**: Used for all layout boxes (replaces raw `<Box>`). Supports `variant`, `bgColor`, `shadow`, `opacity`, `borderRadius` props.
- **`ArgonTypography`**: All text rendering. Supports `color` (maps to theme), `fontWeight`, `textTransform`, `opacity`.
- **`ArgonButton`**: All buttons. Key variants: `variant="gradient"` (primary style), `variant="outlined"`.
- **`ArgonInput`**: All text inputs. Wraps MUI `InputBase`.
- **`ArgonSelect`**: All dropdowns. Wraps `react-select` with Argon theme.

### Dialog Pattern
All CRUD operations use MUI `Dialog` with consistent structure:
```jsx
<Dialog maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
  <DialogTitle><ArgonTypography variant="h5" fontWeight="bold">...</ArgonTypography></DialogTitle>
  <DialogContent>...</DialogContent>
  <DialogActions sx={{ px: 3, pb: 2 }}>
    <ArgonButton variant="outlined" color="dark">Cancel</ArgonButton>
    <ArgonButton variant="gradient" color="success|info">Submit</ArgonButton>
  </DialogActions>
</Dialog>
```

### Styling Conventions
- **Inline `sx` prop** for component-specific styles (not separate CSS files)
- **Touch optimization**: Most interactive elements include `touchAction: "manipulation"`
- **Border radius**: Cards use `16px-20px`, buttons use `12px`, chips use `19px`
- **Dark mode awareness**: Components check `darkMode` from context for color adjustments
- **Color opacity pattern**: Background colors use hex + opacity suffix (e.g., `${color}15` for 15% opacity)

## Theme System

### Light Theme (`assets/theme/index.js`)
Composed from: `colors`, `typography`, `globals`, `borders`, `breakpoints`, `boxShadows` + 40+ component overrides.

### Dark Theme (`assets/theme-dark/index.js`)
Mirrors light theme structure with dark color palette.

### Key Colors
| Token | Light | Usage |
|-------|-------|-------|
| primary | `#5e72e4` | Buttons, highlights, active states |
| success | `#2dce89` | Completed tasks, positive actions |
| error | `#f5365c` | Errors, delete, Mom's color |
| warning | `#fb6340` | Priority indicators, Orange member |
| info | `#11cdef` | Calendar events, informational |
| dark | `#344767` | Text, headers |
| text.main | `#67748e` | Secondary text |

### Fonts
- Primary: **Open Sans** (loaded from Google Fonts CDN)
- Icons: **Nucleo Icons** (custom icon font) + **Material Icons** (Google CDN)

### RTL Support
Full RTL support via `stylis-plugin-rtl` + separate `theme-rtl.js` variants.

## Known Gotchas

1. **`--openssl-legacy-provider` required**: The `start` and `build` scripts include `NODE_OPTIONS=--openssl-legacy-provider` because react-scripts 5.0.1 has OpenSSL compatibility issues with newer Node.js versions.

2. **Peer dependency conflicts**: Use `npm install --legacy-peer-deps` for clean installs. The `install:peer-deps` script exists for this purpose.

3. **`examples/` is misleading**: Despite the name, `src/examples/` contains production reusable components (Sidenav, Navbar, Calendar, Cards, Charts, Tables). These are NOT example/demo code — they're core layout infrastructure.

4. **No TypeScript**: The entire codebase is plain JavaScript with `prop-types` for runtime type checking. No `.ts`/`.tsx` files.

5. **Supabase not fully wired**: The Supabase client exists and connection checking works, but actual CRUD operations against Supabase tables are NOT implemented. All data is in-memory via `useReducer` with hardcoded initial state.

6. **Template bloat**: The `layouts/` directory contains many unused template pages (dashboards, ecommerce, pages, applications). Only 5 routes are active. The template layouts remain for reference/extraction.

7. **Absolute imports**: The project uses CRA absolute imports (e.g., `import ArgonBox from "components/ArgonBox"` not `"./components/ArgonBox"`). This is configured by CRA's `src/` being the base path.

8. **Calendar event className**: FullCalendar events use `className` property mapped to Argon gradient names (`"primary"`, `"error"`, `"success"`, `"warning"`, `"info"`, `"dark"`) — not CSS class names.

9. **ID generation**: New entities use `Date.now()` for IDs (e.g., `task-${Date.now()}`). This works for local state but would need UUID generation for Supabase integration.

10. **No authentication**: No user auth system exists. The app assumes a single family context. Supabase RLS policies are defined in the schema SQL but not enforced client-side.

## Quick Reference

### Common Imports
```js
// Argon components
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import ArgonInput from "components/ArgonInput";
import ArgonSelect from "components/ArgonSelect";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Context
import { useArgonController } from "context";
import { useFamilyController, TASK_CATEGORIES, MEMBER_COLORS, MEMBER_EMOJIS } from "context/FamilyContext";
```

### Adding a New Route
1. Create `src/layouts/your-page/index.js` with `DashboardLayout` + `DashboardNavbar` wrapper
2. Add entry to `src/routes.js` array with `type: "collapse"`, `name`, `key`, `route`, `icon`, `component`
3. The route auto-renders in Sidenav and is registered with React Router in `App.js`

### Adding a New Action to FamilyContext
1. Add action type to `reducer` switch in `context/FamilyContext.js`
2. Dispatch from components via `dispatch({ type: "YOUR_ACTION", value: payload })`
