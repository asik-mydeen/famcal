# Codebase Patterns: FamCal

> Auto-extracted 2026-03-24. Follow EXACTLY unless approved deviation.

## 1. COLOR SYSTEM (Theme Engine Critical)

**Hardcoded hex (current):** `#6C5CE7` (primary), `#7c3aed` (alt), `#a78bfa` (dark), `#f59e0b` (warning), `#22c55e` (success), `#ef4444` (error), `#4ECDC4` (teal/meals)

**Opacity: Hex suffix ONLY (never rgba):**
```javascript
`${color}08` `${color}15` `${color}18` `${color}20` `${color}30` `${color}44`
// ❌ "rgba(108,92,231,0.15)"  ✅ "#6C5CE718"
```

**Member colors:** `bgcolor: member.avatar_color` | `border: \`4px solid ${member.avatar_color}\`` | `boxShadow: \`0 4px 14px ${member.avatar_color}44\``

**Dark mode:** `color: darkMode ? "#fff" : "#1a1a1a"` (95% of cases) | `color: "text.primary"` (theme tokens, rare)

**Gradients:** `background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)"`

**Constants (FamilyContext.js):**
```javascript
export const MEMBER_COLORS = [{ name: "Purple", value: "#6C5CE7", gradient: "primary" }, ...];
export const TASK_CATEGORIES = [{ key: "chores", label: "Chores", icon: "cleaning_services", color: "#7c3aed" }, ...];
```

## 2. TYPOGRAPHY

**Font weight:** 600 (semibold), 700 (bold), 800 (headers)
**Font size:** Headers: 1.6/1.3/1.1rem | Body: 0.95/0.85/0.78rem | Meta: 0.75/0.7/0.65rem
**Icons:** ALWAYS `fontSize: "1.2rem !important"`

```javascript
<Typography variant="h4" fontWeight={700}>Title</Typography>
<Typography fontSize="0.85rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>Body</Typography>
```

## 3. COMPONENT PATTERNS

**Page:**
```javascript
import PageShell from "components/PageShell";
import GlassCard from "components/GlassCard";
import { useFamilyController } from "context/FamilyContext";
import { useThemeMode } from "context/ThemeContext";

function Page() {
  const [state, dispatch] = useFamilyController();
  const { darkMode } = useThemeMode();
  return (
    <PageShell>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}><GlassCard delay={0} hover={false}>{/* Stat */}</GlassCard></Grid>
      </Grid>
      <GlassCard>{/* Content */}</GlassCard>
    </PageShell>
  );
}
```

**SlidePanel (NOT Dialog):**
```javascript
<SlidePanel open={open} onClose={onClose} title="Add" icon="add" width={480}
  actions={<><Button variant="outlined">Cancel</Button><Button variant="contained">Save</Button></>}
>
  <TextField fullWidth label="Title" />
</SlidePanel>
```

**Form (inline useState):**
```javascript
const [form, setForm] = useState({ title: "" });
<TextField value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
const save = () => { dispatch({ type: "ADD_TASK", value: { id: `task-${Date.now()}`, ...form } }); };
```

## 4. STYLING (sx)

**Responsive:** `px: { xs: 2, sm: 3 }` | `fontSize: { xs: "0.8rem", md: "1rem" }` | `display: { xs: "none", lg: "flex" }`

**Border radius:** 20px (cards), 19px (chips), 12px (buttons/inputs), 8px (small), 50% (circles)

**Touch:** `touchAction: "manipulation"` on ALL interactive elements

**Hover:** `"&:hover": { bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", transform: "translateY(-1px)" }`

**Active:** `"&:active": { transform: "scale(0.97)" }`

## 5. ANIMATION

**Entry:**
```javascript
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
  <GlassCard />
</motion.div>
```

**Stagger:** `items.map((item, idx) => <motion.div key={item.id} transition={{ delay: idx * 0.05 }}>{/* Item */}</motion.div>)`

**Exit:**
```javascript
<AnimatePresence mode="popLayout">
  {items.map(item => <motion.div key={item.id} exit={{ opacity: 0, scale: 0.95 }}>{/* Item */}</motion.div>)}
</AnimatePresence>
```

## 6. STATE

**Context:** `const [state, dispatch] = useFamilyController();` | `const { members, tasks } = state;` | `dispatch({ type: "ADD_TASK", value: newTask });`

**Computed:** `const stats = useMemo(() => tasks.filter(t => t.due_date === today), [tasks]);`

**Callbacks:** `const save = useCallback(() => { dispatch({ type: "ADD_TASK", value: { id: \`task-${Date.now()}\`, ...form } }); }, [form, dispatch]);`

## 7. BUTTONS

**Primary:**
```javascript
<Button variant="contained" sx={{ borderRadius: "12px", textTransform: "none", px: 3, fontWeight: 600,
  background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)",
  "&:hover": { background: "linear-gradient(135deg, #5b4bc4 0%, #9775fa 100%)" },
}}>Save</Button>
```

**Secondary:** `<Button variant="outlined" sx={{ borderRadius: "12px", textTransform: "none", borderColor: "divider", color: "text.secondary" }}>Cancel</Button>`

**FAB:**
```javascript
<Fab sx={{ position: "fixed", bottom: { xs: 90, md: 28 }, left: { xs: "50%", md: 28 },
  transform: { xs: "translateX(-50%)", md: "none" },
  background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)", }}>
  <Icon>add</Icon>
</Fab>
```

## 8. IMPORTS (Order)

```javascript
import { useState, useMemo } from "react";              // 1. React
import Box from "@mui/material/Box";                    // 2. MUI (direct, alpha)
import Button from "@mui/material/Button";
import { motion } from "framer-motion";                 // 3. External
import GlassCard from "components/GlassCard";           // 4. Components (absolute)
import { useFamilyController } from "context/FamilyContext";  // 5. Context
import { syncAllMembers } from "lib/googleCalendar";    // 6. Lib
```

## 9. ID GENERATION

`id: \`task-${Date.now()}\`` | `id: \`evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}\`` (events = collision-safe)

## 10. ANTI-PATTERNS

1. ❌ rgba() → ✅ hex suffix
2. ❌ CSS files → ✅ sx
3. ❌ Formik → ✅ useState
4. ❌ MUI Dialog → ✅ SlidePanel
5. ❌ Relative imports → ✅ absolute
6. ❌ Icon w/o !important → ✅ `fontSize: "1.2rem !important"`

## 11. THEME ENGINE MIGRATION

**Token map (future):**
```
"#6C5CE7" → theme.colors.brand.primary
"#7c3aed" → theme.colors.brand.primaryAlt
"#a78bfa" → theme.colors.brand.primaryLight
member.avatar_color → theme.colors.member[member.id]
darkMode ? A : B → theme.colors.adaptive.X
```

**Critical: Opacity suffix must work:** `\`${theme.colors.brand.primary}18\``

**Access patterns to support:**
1. Direct: `bgcolor: "#6C5CE7"`
2. Opacity: `background: "#6C5CE718"`
3. Member: `border: \`1px solid ${member.avatar_color}\``
4. Conditional: `color: darkMode ? "#a78bfa" : "#6C5CE7"`
5. Tokens: `color: "text.primary"`

## Deviation Log

| Date | Pattern | Change | Reason | Approved |
|------|---------|--------|--------|----------|
