# AI Assistant UI Components

Three reusable components for building AI chat interfaces.

## Installation

These components require `react-markdown` and `remark-gfm`:

```bash
npm install react-markdown remark-gfm
```

## Components

### 1. MemoryChip

Dismissible chip showing remembered context with psychology icon.

```jsx
import { MemoryChip } from "components/AIAssistant/components";

<MemoryChip
  memory={{
    id: "mem-123",
    content: "User prefers purple theme and afternoon reminders",
    category: "preferences"
  }}
  onDismiss={(id) => console.log("Dismissed:", id)}
/>
```

**Props:**
- `memory` (object, required):
  - `id` (string): unique identifier
  - `content` (string): memory text (truncated at 40 chars)
  - `category` (string, optional): memory category
- `onDismiss` (function, required): callback with memory id

**Features:**
- Auto-truncates content at 40 characters
- Light purple background (#6C5CE750)
- Close button appears on hover
- Framer Motion fade-in animation
- Dark/light mode support

---

### 2. MessageBubble

Chat message with markdown rendering and action badges.

```jsx
import { MessageBubble } from "components/AIAssistant/components";

// User message
<MessageBubble
  role="user"
  content="Add dentist appointment tomorrow at 2pm"
  timestamp={new Date()}
/>

// Assistant message with actions
<MessageBubble
  role="assistant"
  content="I've added the appointment to your calendar."
  actions={[
    { type: "create_event", data: { title: "Dentist" } }
  ]}
  timestamp={new Date()}
/>
```

**Props:**
- `role` ("user" | "assistant", required): message sender
- `content` (string, required): message text (markdown supported for assistant)
- `actions` (array, optional): action badges to display
- `timestamp` (Date, optional): message timestamp (shown as relative time)

**Features:**
- User: right-aligned, purple gradient bubble
- Assistant: left-aligned, subtle background, **markdown rendering**
- Action badges below message (color-coded by type)
- Relative timestamps ("2m ago", "5h ago")
- Supports markdown: bold, italic, lists, code blocks, links

---

### 3. SuggestionPill

Tappable quick action pill with icon and label.

```jsx
import { SuggestionPill } from "components/AIAssistant/components";

<SuggestionPill
  icon="restaurant"
  label="What's for dinner?"
  onClick={() => console.log("Clicked!")}
/>
```

**Props:**
- `icon` (string, required): Material Icon name
- `label` (string, required): pill text
- `onClick` (function, required): click handler

**Features:**
- Pill shape with Material Icon
- Hover: lifts up 2px with shadow increase
- Framer Motion whileHover animation
- Light mode: white background
- Dark mode: rgba(255,255,255,0.08) background
- Touch-optimized

---

## Usage with AICommandBar

These components can enhance the existing `AICommandBar` component:

```jsx
// Replace plain message rendering with MessageBubble
import { MessageBubble, SuggestionPill, MemoryChip } from "components/AIAssistant/components";

// In conversation area:
messages.map((msg, i) => (
  <MessageBubble
    key={i}
    role={msg.role}
    content={msg.content}
    actions={msg.actions}
    timestamp={msg.timestamp}
  />
))

// In suggestions area:
suggestions.map((s) => (
  <SuggestionPill
    key={s}
    icon="auto_awesome"
    label={s}
    onClick={() => handleSuggestion(s)}
  />
))

// For remembered context:
memories.map((mem) => (
  <MemoryChip
    key={mem.id}
    memory={mem}
    onDismiss={handleDismissMemory}
  />
))
```

## Theme Support

All components use `useThemeMode()` hook from `context/ThemeContext` for automatic dark/light mode switching.

## Styling

Components follow the project's design system:
- Inter font
- Material Icons
- Framer Motion animations
- Touch-optimized (touchAction: manipulation)
- MUI Box + Typography for layout
