# Screensaver Ambient Info Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every 2nd photo transition the screensaver shows a cinema lower-third panel cycling through Tasks → Meals → Events cards with member avatar dots, then fades out — leaving the photo beautiful between reveals.

**Architecture:** App.js computes `ambientInfo` (pre-filtered tasks/meals/events with member colours) via `useMemo` and passes it as a new prop to PhotoFrame. PhotoFrame owns all timing (module-level transition counter, `showInfo` boolean state) and renders the lower-third panel using CSS transitions only. Clock/weather float upward when the panel is visible.

**Tech Stack:** React (plain JS), MUI `Box`/`Typography`/`Icon`, CSS transitions via `sx` prop

---

### Task 1: Compute ambientInfo in App.js

**Files:**
- Modify: `src/App.js`

The `state` object from `useFamilyController()` already contains `tasks`, `meals`, `events`, `members`. Add a `useMemo` below the existing `selectedAlbumIds` memo (~line 680) to compute pre-filtered, pre-shaped ambient data. Then pass it to `<PhotoFrame>`.

- [ ] **Step 1: Add `ambientInfo` useMemo after the `selectedAlbumIds` memo**

Find this block in `src/App.js` (~line 680):
```js
  const selectedAlbumIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("famcal_photos_selected_albums") || "[]"); }
    catch { return []; }
  }, []);
```

Add immediately after it:
```js
  // Ambient info for screensaver lower-third overlay
  const ambientInfo = useMemo(() => {
    if (!dataLoaded) return null;
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    // Tasks: not completed and due today or overdue (no due date counts as always relevant)
    const pendingTasks = (state.tasks || []).filter(
      (t) => !t.completed && (!t.due_date || t.due_date <= today)
    );
    const tasksByMember = {};
    pendingTasks.forEach((task) => {
      const member = (state.members || []).find((m) => m.id === task.assigned_to);
      const key = member?.id || "unassigned";
      if (!tasksByMember[key]) {
        tasksByMember[key] = {
          memberName: member?.name || "Family",
          memberColor: member?.avatar_color || "#888888",
          items: [],
        };
      }
      if (tasksByMember[key].items.length < 2) {
        tasksByMember[key].items.push(task.title);
      }
    });
    const tasks = Object.values(tasksByMember).slice(0, 3);

    // Meals: today only, sorted breakfast → lunch → dinner
    const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
    const MEAL_LABELS = {
      breakfast: { emoji: "🌅", label: "Breakfast" },
      lunch:     { emoji: "☀️", label: "Lunch" },
      dinner:    { emoji: "🌙", label: "Dinner" },
      snack:     { emoji: "🍎", label: "Snack" },
    };
    const meals = (state.meals || [])
      .filter((m) => m.date === today && m.title)
      .sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
      .map((m) => ({
        type: m.meal_type,
        emoji: MEAL_LABELS[m.meal_type]?.emoji || "🍽️",
        label: MEAL_LABELS[m.meal_type]?.label || m.meal_type,
        title: m.title,
      }));

    // Events: today + tomorrow, max 4, sorted by start time
    const events = (state.events || [])
      .filter((e) => {
        const d = (e.start || "").split("T")[0];
        return d === today || d === tomorrow;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 4)
      .map((e) => {
        const member = (state.members || []).find((m) => m.id === e.member_id);
        const eventDate = (e.start || "").split("T")[0];
        let timeLabel;
        if (e.allDay) {
          timeLabel = eventDate === today ? "Today · All day" : "Tomorrow · All day";
        } else {
          const t = new Date(e.start).toLocaleTimeString("en-US", {
            hour: "numeric", minute: "2-digit", hour12: true,
          });
          timeLabel = eventDate === today ? `Today ${t}` : "Tomorrow";
        }
        return {
          memberName: member?.name || "Family",
          memberColor: member?.avatar_color || "#888888",
          title: e.title,
          timeLabel,
        };
      });

    return { tasks, meals, events, totalPendingTasks: pendingTasks.length };
  }, [state.tasks, state.meals, state.events, state.members, dataLoaded]);
```

- [ ] **Step 2: Pass `ambientInfo` to PhotoFrame**

Find the PhotoFrame render block (~line 827):
```jsx
            return (
              <PhotoFrame
                photos={combined}
                interval={parseInt(localStorage.getItem("famcal_photo_interval") || "10")}
                weather={weatherData}
                onDismiss={() => {
```

Add `ambientInfo={ambientInfo}` after `weather={weatherData}`:
```jsx
            return (
              <PhotoFrame
                photos={combined}
                interval={parseInt(localStorage.getItem("famcal_photo_interval") || "10")}
                weather={weatherData}
                ambientInfo={ambientInfo}
                onDismiss={() => {
```

- [ ] **Step 3: Commit**

```bash
git add src/App.js
git commit -m "feat(screensaver): compute ambientInfo and pass to PhotoFrame"
```

---

### Task 2: Add timing state + module var to PhotoFrame

**Files:**
- Modify: `src/components/PhotoFrame/index.js`

- [ ] **Step 1: Add module-level transition counter after the existing `FADE_TIME` constant**

Find (~line 23):
```js
const FADE_TIME = 1500; // 1.5s crossfade
```

Add after it:
```js
// Module-level counter — avoids CRA closure bugs in setInterval callbacks
let moduleTransitionCount = 0;
```

- [ ] **Step 2: Add `ambientInfo` to the function signature and add `showInfo`/`infoCardIndex` state**

Find (~line 28):
```js
function PhotoFrame({ photos, interval = 10, weather, onDismiss }) {
```

Replace with:
```js
function PhotoFrame({ photos, interval = 10, weather, ambientInfo, onDismiss }) {
```

Find (~line 32):
```js
  const [fading, setFading] = useState(false);
```

Add after it:
```js
  const [showInfo, setShowInfo] = useState(false);
  const [infoCardIndex, setInfoCardIndex] = useState(0);
```

- [ ] **Step 3: Reset moduleTransitionCount on mount/unmount**

Find the existing clock `useEffect` (~line 39 — the one with `setTime`/`setDate`). Add a new `useEffect` immediately before it:
```js
  // Reset transition counter when screensaver starts
  useEffect(() => {
    moduleTransitionCount = 0;
    return () => { moduleTransitionCount = 0; };
  }, []);
```

- [ ] **Step 4: Add info panel trigger inside the photo cycling `useEffect`**

Find the photo cycling useEffect. It looks like this:
```js
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => {
        setPrevious(prev);
        setFading(true);
        const next = (prev + 1) % photos.length;
        // Generate new Ken Burns for next photo
        kenBurnsRef.current[next] = randomKenBurns();
        setTimeout(() => { setFading(false); setPrevious(-1); }, FADE_TIME);
        return next;
      });
    }, displayTime);
    return () => clearInterval(timer);
  }, [photos.length, displayTime]);
```

Replace with:
```js
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => {
        setPrevious(prev);
        setFading(true);
        const next = (prev + 1) % photos.length;
        kenBurnsRef.current[next] = randomKenBurns();
        setTimeout(() => { setFading(false); setPrevious(-1); }, FADE_TIME);

        // Trigger ambient info panel every 2nd transition
        moduleTransitionCount += 1;
        if (moduleTransitionCount % 2 === 0 && ambientInfo) {
          const activeCards = [
            ambientInfo.tasks?.length > 0 && "tasks",
            ambientInfo.meals?.length > 0 && "meals",
            ambientInfo.events?.length > 0 && "events",
          ].filter(Boolean);
          if (activeCards.length > 0) {
            setInfoCardIndex((idx) => (idx + 1) % activeCards.length);
            setShowInfo(true);
            setTimeout(() => setShowInfo(false), 8000);
          }
        }

        return next;
      });
    }, displayTime);
    return () => clearInterval(timer);
  }, [photos.length, displayTime, ambientInfo]);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PhotoFrame/index.js
git commit -m "feat(screensaver): add ambient overlay timing state and trigger logic"
```

---

### Task 3: Render lower-third panel with 3 card types

**Files:**
- Modify: `src/components/PhotoFrame/index.js`

Add three inline helper components and the panel render. These go at the top of the file (before `randomKenBurns`) — plain functions, not exported.

- [ ] **Step 1: Add card helper components at the top of the file, after the imports**

Find (~line 6, after the Icon import):
```js
import Icon from "@mui/material/Icon";
```

Add after it:
```js
// ── Ambient info card sub-components ──────────────────────────────────────

function TasksCard({ tasks, total }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>task_alt</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Today's Tasks
        </Typography>
        {total > 0 && (
          <Box sx={{ ml: 1, px: 1, py: 0.25, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.15)" }}>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "white" }}>{total} pending</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tasks.map((row, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.memberColor, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "white", minWidth: 80, flexShrink: 0 }}>
              {row.memberName}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
              {row.items.join(" · ")}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MealsCard({ meals }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>restaurant</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Today's Meals
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {meals.map((meal, i) => (
          <Box key={i} display="flex" alignItems="center" gap={2}>
            <Typography sx={{ fontSize: "1.1rem", lineHeight: 1, width: 28, flexShrink: 0 }}>{meal.emoji}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", width: 80, flexShrink: 0 }}>
              {meal.label}
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "white" }}>
              {meal.title}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function EventsCard({ events }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>event</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Coming Up
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {events.map((evt, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: evt.memberColor, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "white", minWidth: 80, flexShrink: 0 }}>
              {evt.memberName}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", flex: 1 }}>
              {evt.title}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", flexShrink: 0, ml: 2 }}>
              {evt.timeLabel}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Add the lower-third panel render inside the main PhotoFrame return**

Find the art attribution comment (~line 205):
```js
      {/* Art attribution — shown for artwork photos (bottom right, above weather) */}
```

Add a new block immediately **before** the art attribution comment:
```js
      {/* Ambient info lower-third panel — cycles Tasks / Meals / Events */}
      {ambientInfo && (() => {
        const activeCards = [
          ambientInfo.tasks?.length  > 0 && "tasks",
          ambientInfo.meals?.length  > 0 && "meals",
          ambientInfo.events?.length > 0 && "events",
        ].filter(Boolean);
        if (activeCards.length === 0) return null;
        const currentCard = activeCards[infoCardIndex % activeCards.length];
        return (
          <Box sx={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            transform: showInfo ? "translateY(0)" : "translateY(100%)",
            opacity: showInfo ? 1 : 0,
            transition: showInfo
              ? "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease"
              : "opacity 1000ms ease, transform 800ms ease",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            px: { xs: 3, md: 5 }, pt: 3, pb: 4,
            pointerEvents: "none",
            zIndex: 2,
          }}>
            {/* Gradient blend into photo above */}
            <Box sx={{
              position: "absolute", top: -40, left: 0, right: 0, height: 40,
              background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
              pointerEvents: "none",
            }} />
            {currentCard === "tasks"  && <TasksCard  tasks={ambientInfo.tasks}  total={ambientInfo.totalPendingTasks} />}
            {currentCard === "meals"  && <MealsCard  meals={ambientInfo.meals} />}
            {currentCard === "events" && <EventsCard events={ambientInfo.events} />}
          </Box>
        );
      })()}

```

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoFrame/index.js
git commit -m "feat(screensaver): render lower-third ambient info panel with Tasks/Meals/Events cards"
```

---

### Task 4: Float clock and weather upward when panel is visible + add PropTypes

**Files:**
- Modify: `src/components/PhotoFrame/index.js`

When the info panel slides up, the clock (`bottom: 40, left: 40`) and weather (`bottom: 40, right: 40`) would sit inside the panel. Animate them upward using the same `showInfo` boolean.

- [ ] **Step 1: Update the clock Box to float up when showInfo is true**

Find (~line 157):
```js
      {/* Clock — bottom left, large and elegant */}
      <Box sx={{
        position: "absolute", bottom: 40, left: 40,
        color: "white", pointerEvents: "none",
      }}>
```

Replace with:
```js
      {/* Clock — bottom left, large and elegant */}
      <Box sx={{
        position: "absolute",
        bottom: showInfo ? 280 : 40,
        left: 40,
        color: "white", pointerEvents: "none",
        transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
```

- [ ] **Step 2: Update art attribution bottom offset to also account for panel**

Find the art attribution box (~line 210):
```js
            bottom: weather ? 140 : 40,
```

Replace with:
```js
            bottom: showInfo ? (weather ? 340 : 240) : (weather ? 140 : 40),
            transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
```

- [ ] **Step 3: Update the weather Box to float up when showInfo is true**

Find (~line 179):
```js
      {weather && (
        <Box sx={{
          position: "absolute", bottom: 40, right: 40,
          color: "white", pointerEvents: "none", textAlign: "right",
        }}>
```

Replace with:
```js
      {weather && (
        <Box sx={{
          position: "absolute",
          bottom: showInfo ? 280 : 40,
          right: 40,
          color: "white", pointerEvents: "none", textAlign: "right",
          transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}>
```

- [ ] **Step 4: Add ambientInfo to PropTypes**

Find the PropTypes block (~line 280):
```js
PhotoFrame.propTypes = {
  photos: PropTypes.arrayOf(
```

Add `ambientInfo` as an optional shape after `onDismiss`:
```js
  onDismiss: PropTypes.func.isRequired,
  ambientInfo: PropTypes.shape({
    tasks: PropTypes.arrayOf(PropTypes.shape({
      memberName: PropTypes.string,
      memberColor: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.string),
    })),
    meals: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string,
      emoji: PropTypes.string,
      label: PropTypes.string,
      title: PropTypes.string,
    })),
    events: PropTypes.arrayOf(PropTypes.shape({
      memberName: PropTypes.string,
      memberColor: PropTypes.string,
      title: PropTypes.string,
      timeLabel: PropTypes.string,
    })),
    totalPendingTasks: PropTypes.number,
  }),
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PhotoFrame/index.js
git commit -m "feat(screensaver): float clock/weather above panel + add ambientInfo PropTypes"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm start
```

Expected: compiles without ESLint errors.

- [ ] **Step 2: Verify timing**

1. Go to Settings → Screensaver → enable a source → click **Start Now**
2. The first photo should display cleanly with **no panel**
3. After the 2nd photo transition, the lower-third panel should slide up from the bottom
4. Panel stays ~8 seconds, then fades out
5. Clock and weather should float upward as panel appears, drop back down when it exits

- [ ] **Step 3: Verify card cycling**

1. Wait for the next trigger (2 more transitions)
2. Panel should show the **next** card in the cycle (Tasks → Meals → Events → repeat)
3. If a card type has no data (e.g. no meals planned), it is skipped

- [ ] **Step 4: Verify member attribution**

1. Ensure a task is assigned to a family member with a colour
2. In the Tasks card, verify the correct avatar colour dot and member name appears

- [ ] **Step 5: Verify no regressions**

1. Tap to dismiss — screensaver closes normally
2. Art photos still show attribution overlay
3. Clock and date display correctly when panel is hidden
