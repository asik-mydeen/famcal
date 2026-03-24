# Codebase Patterns: FamCal

> Auto-extracted 2026-03-24. Follow EXACTLY. To deviate: propose, get approval, update file.

## 1. File Organization

```
src/layouts/              # Pages (family-calendar, tasks, family, rewards, settings)
src/components/           # Reusable (GlassCard, SlidePanel)
src/context/              # State (FamilyContext.js = useReducer)
src/lib/                  # External (supabase.js, googleCalendar.js)
```

**Naming**: `index.js` in PascalCase dirs. Constants `UPPER_SNAKE`. Functions `camelCase`.

## 2. Imports (Strict Order)

```javascript
// 1. React hooks
import { useState, useMemo, useCallback } from "react";
// 2. MUI (direct, alphabetical)
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// 3. External libs
import { motion } from "framer-motion";
// 4. Custom (absolute from src/)
import GlassCard from "components/GlassCard";
// 5. Context
import { useFamilyController } from "context/FamilyContext";
// 6. Lib
import { uploadAvatar } from "lib/supabase";
```

**Absolute ONLY**: `import GlassCard from "components/GlassCard"` NOT `"../../../components/GlassCard"`

## 3. Component Structure

```javascript
function ComponentName() {
  const [state, dispatch] = useFamilyController();
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => data.filter(...), [data]);
  const handleSave = useCallback(() => {...}, [deps]);
  useEffect(() => {...}, [deps]);
  return <Box sx={{...}}>...</Box>;
}
ComponentName.propTypes = {...}; // After component, before export
export default ComponentName;
```

**Functional only. No classes.**

## 4. State

```javascript
const [state, dispatch] = useFamilyController();
const { members, tasks } = state;
dispatch({ type: "ADD_TASK", value: newTask });
```

## 5. Styling (sx Only)

```javascript
<Box sx={{
  px: { xs: 2, sm: 3 },              // Responsive
  borderRadius: "20px",               // Card: 20px, Button: 12px
  bgcolor: "background.paper",        // Theme tokens
  background: `${color}18`,           // Opacity hex suffix
  touchAction: "manipulation",        // Touch optimization
}}>
```

**NO** CSS files. **NO** styled-components.

## 6. Layout

```javascript
function Page() {
  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Title</Typography>
        <Typography variant="body2" color="text.secondary">Subtitle</Typography>
      </Box>
      <Grid container spacing={3}>...</Grid>
    </Box>
  );
}
```

**NO DashboardLayout wrapper.**

## 7. Dialogs: SlidePanel

```javascript
<SlidePanel open={open} onClose={onClose} title="Add Task" icon="add" width={480}
  actions={<><Button>Cancel</Button><Button>Save</Button></>}
>
  <TextField fullWidth label="Title" />
</SlidePanel>
```

**NOT MUI Dialog. Slides from right (desktop), full-screen (mobile).**

## 8. Forms

```javascript
const [formData, setFormData] = useState({ title: "" });
const handleChange = useCallback((field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
}, []);
<TextField value={formData.title} onChange={(e) => handleChange("title", e.target.value)} />
```

**Inline `useState`. NOT Formik.**

## 9. Animation

```javascript
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
  <GlassCard />
</motion.div>
{items.map((item, idx) => (
  <motion.div key={item.id} transition={{ delay: idx * 0.04 }}>...</motion.div>
))}
<AnimatePresence mode="wait">{condition ? <A key="a" /> : <B key="b" />}</AnimatePresence>
```

## 10. Constants

```javascript
const PRIORITY_COLORS = { high: "#f43f5e", medium: "#f59e0b" }; // File-scoped
export const MEMBER_COLORS = [...]; // Context-exported
```

## 11. IDs

```javascript
const id = `task-${Date.now()}`;
const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
```

## 12. Date/Time

```javascript
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
```

## 13. Dark Mode

```javascript
const { darkMode } = useThemeMode();
sx={{ bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "#ffffff" }}
```

## 14. Icons

```javascript
<Icon sx={{ fontSize: "1.2rem !important", color: "#6C5CE7" }}>add</Icon>
```

**Always `!important` for fontSize.**

## 15. Buttons

```javascript
<Button variant="contained" sx={{
  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
  borderRadius: "12px", textTransform: "none", fontWeight: 600,
}}>Save</Button>
<Button variant="outlined" sx={{ borderColor: "divider", borderRadius: "12px", textTransform: "none" }}>Cancel</Button>
```

## 16. FAB

```javascript
<Fab sx={{
  position: "fixed", bottom: { xs: 90, md: 28 }, left: { xs: "50%", md: 28 },
  transform: { xs: "translateX(-50%)", md: "none" },
  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", zIndex: 1200,
}}>
  <Icon>add</Icon>
</Fab>
```

## 17. Grid

```javascript
<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}><GlassCard /></Grid>
</Grid>
```

**Breakpoints**: xs < 600, sm 600+, md 900+, lg 1200+, xl 1536+

## 18. Error Handling

```javascript
connect().catch(err => console.warn("Failed:", err.message)); // Console only
if (!formData.title) return; // Inline validation
<Button disabled={!formData.title}>Save</Button>
```

## 19. PropTypes

```javascript
ComponentName.propTypes = { prop1: PropTypes.string.isRequired };
```

**After component, before export.**

## Anti-Patterns (DO NOT)

1. NO relative imports → use absolute from `src/`
2. NO DashboardLayout wrapper
3. NO Formik → inline `useState`
4. NO CSS files → `sx` prop
5. NO mid-file exports → export at end
6. NO class components → functional + hooks
7. NO MUI Dialog → SlidePanel
8. NO `rgba()` → hex + opacity suffix (`${color}18`)
9. NO magic strings → constants/theme tokens
10. NO `any` in PropTypes → specify type

## Code Examples

### Full Page Pattern
```javascript
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import GlassCard from "components/GlassCard";
import { useFamilyController } from "context/FamilyContext";

function PageName() {
  const [state, dispatch] = useFamilyController();
  const { members } = state;
  
  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Title</Typography>
      </Box>
      <Grid container spacing={3}>
        {members.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <GlassCard><Typography>{m.name}</Typography></GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default PageName;
```

### Dialog with Form
```javascript
import SlidePanel from "components/SlidePanel";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

const [open, setOpen] = useState(false);
const [form, setForm] = useState({ title: "" });

<SlidePanel
  open={open}
  onClose={() => setOpen(false)}
  title="Add Item"
  icon="add"
  actions={
    <>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave} disabled={!form.title}>Save</Button>
    </>
  }
>
  <TextField
    fullWidth
    label="Title"
    value={form.title}
    onChange={(e) => setForm({ ...form, title: e.target.value })}
  />
</SlidePanel>
```

## Deviation Log

| Date | Pattern | Change | Reason | Approved |
|------|---------|--------|--------|----------|
| — | — | — | — | — |
