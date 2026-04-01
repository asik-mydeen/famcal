# Calendar Sidebar Redesign: Icon Rail + Expandable Panel

> Date: 2026-04-01 | Status: Approved

## Problem

The SmartSidebar (280px) crams 6 full CRUD widgets (Messages, Notes, Countdowns, Chores, Dinner, Mood) into a narrow vertical scroll. Rich widgets like MessageBoard (text input + From/To pickers + message list) are unusable at 280px. The sidebar also permanently steals horizontal space from the calendar.

Additionally, the event editing SlidePanel (420px MUI Drawer from right) blocks the calendar with a backdrop overlay, and there's no lightweight event preview — tapping goes straight to a 9-field edit form.

## Design

### 1. Icon Rail (~52px)

Thin vertical strip on the right edge of the calendar layout. Always visible on desktop (lg+), hidden on mobile.

**Icons (top to bottom):**
| Icon | Label | Badge |
|------|-------|-------|
| `forum` | Messages | Unread count |
| `sticky_note_2` | Notes | Active count |
| `timer` | Countdowns | — |
| `task_alt` | Today's Chores | Pending count |
| `restaurant` | Tonight's Dinner | — |
| `mood` | Mood | — |

**Behavior:**
- Tap icon → expand panel with that widget's content
- Tap same icon → collapse panel
- Tap different icon → switch panel content (animated crossfade)
- Active icon gets highlight background + accent color
- Badge counts update in real-time from state

**Styling:**
- Width: 52px
- Background: subtle glass (matches theme tokens)
- Border-left: 1px solid divider
- Icons: 1.3rem, muted color, accent when active
- Badge: small dot or number, accent color
- Touch: `touchAction: "manipulation"` on all icons

### 2. Expandable Panel (380px)

Slides out from the icon rail when a widget icon is tapped. Pushes the calendar left (no overlay/backdrop).

**Structure:**
```
┌──────────────────────────────┐
│ [icon] Title           [✕]  │  ← header (sticky)
├──────────────────────────────┤
│                              │
│  Widget content (scrollable) │
│                              │
└──────────────────────────────┘
```

**Behavior:**
- Animated expand/collapse with framer-motion (spring, 300ms)
- Calendar flex layout adjusts (no fixed width subtraction — flex handles it)
- Content switches with crossfade animation (150ms out, 150ms in)
- Close via: ✕ button, tap active icon, ESC key
- Preserves scroll position per widget (ref map)

**Content types (mutually exclusive):**
1. **Widget content** — Messages, Notes, Countdowns, Chores, Dinner, Mood
2. **Event details/edit form** — replaces widget when editing an event
3. **Event comments** — when tapping comment icon on peek card

**Styling:**
- Width: 380px (fixed)
- Background: `tokens.panel.bg` (same as current SlidePanel)
- Border-left: 1px solid `tokens.panel.border`
- Header: icon badge + title + close button
- Content: flex column, overflow-y auto, padding 20px

### 3. Event Peek Card

Floating card that appears when tapping a calendar event. Anchored near the event, not in the panel.

**Content:**
```
┌─────────────────────────────┐
│ 🟣 Event Title              │
│ 3:00 PM – 4:30 PM · Aarish  │
│ ─────────────────────────── │
│  ✏️ Edit   💬 2   🗑️ Delete  │
└─────────────────────────────┘
```

**Behavior:**
- Appears with scale+fade animation (origin = event position)
- Positioned above or below event (flips if near viewport edge)
- Max width: 300px
- Dismiss: tap outside, tap another event, scroll calendar
- Edit → opens panel with event form (auto-closes any widget)
- 💬 → opens panel scrolled to event comments
- Delete → inline confirm (button text changes to "Confirm?" for 3s)

**Styling:**
- Background: glass card (matches GlassCard pattern)
- Border-radius: 16px
- Box-shadow: elevation 3
- Member color dot before title
- Action icons: 1.1rem, muted, accent on hover

### 4. Event Form in Panel

When editing/creating an event, the expandable panel shows the event form. A temporary calendar icon appears active in the icon rail.

**Create mode (compact):**
- Title (auto-focus)
- Member assignment (avatar chips, not dropdown)
- Date + time (single row)
- "More options" expander → recurrence, reminders, all-day toggle

**Edit mode (full):**
- All fields visible
- Event comments section below form (with divider)
- Delete button in footer

**Interaction:**
- Tap widget icon while editing → if form is dirty, show "Discard changes?" confirm inline; if clean, switch immediately
- Save → panel stays open showing the widget that was previously active (or closes if no widget was active)
- Cancel → same behavior as save (return to previous state)

### 5. Mobile Adaptation (xs/sm)

- Icon rail: hidden
- Widgets: accessible via a horizontal pill bar at the top of the calendar page, or via the existing mobile nav
- Event tap → bottom sheet (peek height) instead of peek card
- Event edit → full-screen bottom sheet (from current SlidePanel mobile behavior)
- This is a progressive enhancement — mobile keeps working with minimal changes

### 6. Files to Create/Modify

**New components:**
- `src/components/IconRail/index.js` — the icon rail
- `src/components/ExpandablePanel/index.js` — the expanding panel
- `src/components/EventPeekCard/index.js` — floating event preview

**Modified files:**
- `src/layouts/family-calendar/index.js` — replace SmartSidebar + SlidePanel with new components
- `src/components/SmartSidebar/index.js` — deprecated (keep for now, unused)

**Unchanged:**
- `src/components/MessageBoard/index.js` — rendered inside ExpandablePanel instead of SmartSidebar
- `src/components/NotesWidget/index.js` — same
- All other widget components — same (just re-parented)

### 7. State Management

```javascript
// In family-calendar/index.js
const [activePanel, setActivePanel] = useState(null);
// null | "messages" | "notes" | "countdowns" | "chores" | "dinner" | "mood" | "event-edit" | "event-comments"

const [peekCard, setPeekCard] = useState(null);
// null | { event, anchorRect }

const [previousPanel, setPreviousPanel] = useState(null);
// remembers which widget was open before event-edit, to restore after save/cancel
```

No new context needed. All widget data already comes from FamilyContext.
