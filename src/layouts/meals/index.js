import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "components/PageTransition";
import GlassCard from "components/GlassCard";
import MealGrid from "components/MealGrid";
import SlidePanel from "components/SlidePanel";
import { useFamilyController } from "context/FamilyContext";

const INITIAL_MEAL_FORM = {
  title: "",
  notes: "",
};

function Meals() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const [state, dispatch] = useFamilyController();
  const { meals, family, lists } = state;

  const [weekOffset, setWeekOffset] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openGroceryDialog, setOpenGroceryDialog] = useState(false);
  const [mealForm, setMealForm] = useState(INITIAL_MEAL_FORM);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [groceryItems, setGroceryItems] = useState("");

  // Week calculation
  const getMonday = useCallback((offset) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const weekStart = useMemo(() => getMonday(weekOffset), [weekOffset, getMonday]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const month = weekStart.toLocaleDateString("en-US", { month: "short" });
    const day = weekStart.getDate();
    return `Week of ${month} ${day}`;
  }, [weekStart]);

  // Filter meals for current week
  const weekMeals = useMemo(() => {
    const startStr = weekStart.toISOString().split("T")[0];
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    const endStr = endDate.toISOString().split("T")[0];

    return meals.filter((m) => m.date >= startStr && m.date <= endStr);
  }, [meals, weekStart]);

  // Tonight's dinner
  const tonightsDinner = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return meals.find((m) => m.date === todayStr && m.meal_type === "dinner");
  }, [meals]);

  // Handlers
  const handleCellClick = useCallback((date, mealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setEditingMeal(null);
    setMealForm(INITIAL_MEAL_FORM);
    setOpenDialog(true);
  }, []);

  const handleMealEdit = useCallback((meal) => {
    setEditingMeal(meal);
    setMealForm({ title: meal.title, notes: meal.notes || "" });
    setSelectedDate(new Date(meal.date));
    setSelectedMealType(meal.meal_type);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingMeal(null);
    setMealForm(INITIAL_MEAL_FORM);
  }, []);

  const handleSaveMeal = useCallback(() => {
    if (!mealForm.title.trim()) return;

    const dateStr = selectedDate.toISOString().split("T")[0];
    const mealData = {
      family_id: family.id,
      date: dateStr,
      meal_type: selectedMealType,
      title: mealForm.title,
      notes: mealForm.notes,
    };

    if (editingMeal) {
      dispatch({
        type: "UPDATE_MEAL",
        value: { ...editingMeal, ...mealData },
      });
    } else {
      dispatch({
        type: "ADD_MEAL",
        value: { id: `meal-${Date.now()}`, ...mealData },
      });
    }

    handleCloseDialog();
  }, [mealForm, selectedDate, selectedMealType, editingMeal, family.id, dispatch, handleCloseDialog]);

  const handleDeleteMeal = useCallback(() => {
    if (editingMeal) {
      dispatch({ type: "REMOVE_MEAL", value: editingMeal.id });
      handleCloseDialog();
    }
  }, [editingMeal, dispatch, handleCloseDialog]);

  const handleAddToGroceryList = useCallback(() => {
    setGroceryItems(mealForm.title);
    setOpenGroceryDialog(true);
  }, [mealForm.title]);

  const handleCloseGroceryDialog = useCallback(() => {
    setOpenGroceryDialog(false);
    setGroceryItems("");
  }, []);

  const handleSaveToGroceryList = useCallback(() => {
    // Find or create Groceries list
    let groceriesList = lists.find((l) => l.title.toLowerCase() === "groceries");

    if (!groceriesList) {
      // Create new Groceries list
      const newList = {
        id: `list-${Date.now()}`,
        family_id: family.id,
        title: "Groceries",
        items: [],
      };
      dispatch({ type: "ADD_LIST", value: newList });
      groceriesList = newList;
    }

    // Parse items (one per line)
    const items = groceryItems
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Add each item
    items.forEach((text) => {
      const item = {
        id: `item-${Date.now()}-${Math.random()}`,
        text,
        checked: false,
        checked_at: null,
      };
      dispatch({
        type: "ADD_LIST_ITEM",
        value: { listId: groceriesList.id, item },
      });
    });

    handleCloseGroceryDialog();
  }, [groceryItems, lists, family.id, dispatch, handleCloseGroceryDialog]);

  const handleCopyLastWeek = useCallback(() => {
    const lastWeekStart = getMonday(weekOffset - 1);
    const lastWeekStartStr = lastWeekStart.toISOString().split("T")[0];
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    const lastWeekEndStr = lastWeekEnd.toISOString().split("T")[0];

    // Get meals from last week
    const lastWeekMeals = meals.filter((m) => m.date >= lastWeekStartStr && m.date <= lastWeekEndStr);

    if (lastWeekMeals.length === 0) return;

    // Copy to this week (same day index, +7 days)
    lastWeekMeals.forEach((meal) => {
      const oldDate = new Date(meal.date);
      const newDate = new Date(oldDate);
      newDate.setDate(newDate.getDate() + 7);
      const newDateStr = newDate.toISOString().split("T")[0];

      // Don't duplicate if meal already exists
      const exists = meals.some((m) => m.date === newDateStr && m.meal_type === meal.meal_type);
      if (!exists) {
        dispatch({
          type: "ADD_MEAL",
          value: {
            id: `meal-${Date.now()}-${Math.random()}`,
            family_id: family.id,
            date: newDateStr,
            meal_type: meal.meal_type,
            title: meal.title,
            notes: meal.notes,
          },
        });
      }
    });
  }, [weekOffset, meals, family.id, dispatch, getMonday]);

  return (
    <PageTransition>
      <Box p={3} pb={6}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" fontWeight={700}>
            Meal Plan
          </Typography>
        </Box>

        {/* Tonight's Dinner Banner */}
        {tonightsDinner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "12px",
                background: darkMode
                  ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.2))"
                  : "linear-gradient(135deg, rgba(78,205,196,0.15), rgba(78,205,196,0.08))",
                border: darkMode ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(78,205,196,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Icon sx={{ color: darkMode ? "#a855f7" : "#0f766e", fontSize: "1.5rem" }}>restaurant</Icon>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Tonight&apos;s Dinner
                </Typography>
                <Typography variant="body1" fontWeight={700} color={darkMode ? "#e9d5ff" : "#0f766e"}>
                  {tonightsDinner.title}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* Week navigation + Copy button */}
        <GlassCard sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => setWeekOffset((prev) => prev - 1)} size="small">
                <Icon>chevron_left</Icon>
              </IconButton>
              <Typography variant="h6" fontWeight={600}>
                {weekLabel}
              </Typography>
              <IconButton onClick={() => setWeekOffset((prev) => prev + 1)} size="small">
                <Icon>chevron_right</Icon>
              </IconButton>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon>content_copy</Icon>}
              onClick={handleCopyLastWeek}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                color: darkMode ? "#fff" : "#000",
                "&:hover": {
                  borderColor: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                },
              }}
            >
              Copy Last Week
            </Button>
          </Box>
        </GlassCard>

        {/* Meal Grid */}
        <GlassCard>
          <MealGrid
            meals={weekMeals}
            weekDates={weekDates}
            onCellClick={handleCellClick}
            onMealEdit={handleMealEdit}
            darkMode={darkMode}
          />
        </GlassCard>

        {/* Add/Edit Meal SlidePanel */}
        <SlidePanel
          open={openDialog}
          onClose={handleCloseDialog}
          title={editingMeal ? "Edit Meal" : "Add Meal"}
          icon="restaurant"
          actions={
            <>
              {editingMeal && (
                <Button
                  onClick={handleDeleteMeal}
                  variant="outlined"
                  color="error"
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    mr: "auto",
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                onClick={handleAddToGroceryList}
                variant="outlined"
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  borderColor: darkMode ? "rgba(78,205,196,0.3)" : "rgba(78,205,196,0.5)",
                  color: darkMode ? "#4ECDC4" : "#0f766e",
                  "&:hover": {
                    borderColor: darkMode ? "rgba(78,205,196,0.5)" : "rgba(78,205,196,0.7)",
                    background: darkMode ? "rgba(78,205,196,0.05)" : "rgba(78,205,196,0.05)",
                  },
                }}
              >
                Add to Grocery List
              </Button>
              <Button
                onClick={handleCloseDialog}
                variant="outlined"
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  color: darkMode ? "#fff" : "#000",
                  borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMeal}
                variant="contained"
                disabled={!mealForm.title.trim()}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  background: darkMode
                    ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                    : "linear-gradient(135deg, #4ECDC4, #44a6a0)",
                  color: "#fff",
                  "&:hover": {
                    background: darkMode
                      ? "linear-gradient(135deg, #6d28d9, #9333ea)"
                      : "linear-gradient(135deg, #44a6a0, #3d9590)",
                  },
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <TextField
            label="Meal Title"
            value={mealForm.title}
            onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
            fullWidth
            autoFocus
          />
          <TextField
            label="Notes (optional)"
            value={mealForm.notes}
            onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
        </SlidePanel>

        {/* Add to Grocery List Dialog */}
        <Dialog
          open={openGroceryDialog}
          onClose={handleCloseGroceryDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
              background: darkMode ? "rgba(30,30,30,0.98)" : "#fff",
              border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "none",
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight={700}>
              Add to Grocery List
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box pt={1}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Enter grocery items (one per line)
              </Typography>
              <TextField
                value={groceryItems}
                onChange={(e) => setGroceryItems(e.target.value)}
                fullWidth
                multiline
                rows={6}
                placeholder="Chicken breast&#10;Broccoli&#10;Rice"
                autoFocus
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseGroceryDialog}
              variant="outlined"
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                color: darkMode ? "#fff" : "#000",
                borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToGroceryList}
              variant="contained"
              disabled={!groceryItems.trim()}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                background: darkMode
                  ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                  : "linear-gradient(135deg, #4ECDC4, #44a6a0)",
                color: "#fff",
                "&:hover": {
                  background: darkMode
                    ? "linear-gradient(135deg, #6d28d9, #9333ea)"
                    : "linear-gradient(135deg, #44a6a0, #3d9590)",
                },
              }}
            >
              Add Items
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
}

export default Meals;
