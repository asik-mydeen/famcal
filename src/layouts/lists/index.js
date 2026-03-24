import { useState, useMemo, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import SlidePanel from "components/SlidePanel";
import PageShell from "components/PageShell";
import { useFamilyController } from "context/FamilyContext";
import { useTheme } from "@mui/material/styles";

const GROCERY_CATEGORIES = {
  Produce: ["apple", "banana", "lettuce", "tomato", "onion", "potato", "avocado", "spinach", "carrot", "berry", "fruit", "vegetable", "pepper", "cucumber", "broccoli"],
  Dairy: ["milk", "cheese", "yogurt", "butter", "cream", "egg"],
  Meat: ["chicken", "beef", "pork", "fish", "salmon", "turkey", "shrimp", "meat"],
  Pantry: ["rice", "pasta", "bread", "flour", "sugar", "oil", "sauce", "cereal", "can", "beans", "spice"],
  Frozen: ["frozen", "ice cream", "pizza"],
};

const LIST_ICONS = [
  { value: "shopping_cart", label: "Shopping Cart" },
  { value: "checklist", label: "Checklist" },
  { value: "list", label: "List" },
  { value: "receipt", label: "Receipt" },
  { value: "inventory", label: "Inventory" },
  { value: "assignment", label: "Assignment" },
];

function categorizeItem(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(GROCERY_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return "Other";
}

export default function Lists() {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const [state, dispatch] = useFamilyController();
  const { lists, members } = state;

  const [activeListId, setActiveListId] = useState(null);
  const [openNewListDialog, setOpenNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState("shopping_cart");
  const [newItemText, setNewItemText] = useState("");

  // Auto-create default "Groceries" list if no lists exist
  useEffect(() => {
    if (lists.length === 0) {
      const defaultList = {
        id: `list-${Date.now()}`,
        family_id: "demo-family",
        name: "Groceries",
        icon: "shopping_cart",
        items: [],
      };
      dispatch({ type: "ADD_LIST", value: defaultList });
      setActiveListId(defaultList.id);
    } else if (!activeListId && lists.length > 0) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId, dispatch]);

  const activeList = useMemo(() => lists.find(l => l.id === activeListId), [lists, activeListId]);

  // Categorize and sort items
  const categorizedItems = useMemo(() => {
    if (!activeList || !activeList.items) return {};

    const isGroceryList = activeList.name.toLowerCase().includes("groceries");
    const grouped = {};

    activeList.items.forEach(item => {
      const category = isGroceryList ? (item.category || categorizeItem(item.text)) : "Items";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    // Sort items within each category: unchecked first (by sort_order), then checked
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    });

    return grouped;
  }, [activeList]);

  const checkedItemsCount = useMemo(() => {
    if (!activeList || !activeList.items) return 0;
    return activeList.items.filter(item => item.checked).length;
  }, [activeList]);

  const handleCreateList = useCallback(() => {
    if (!newListName.trim()) return;

    const newList = {
      id: `list-${Date.now()}`,
      family_id: "demo-family",
      name: newListName.trim(),
      icon: newListIcon,
      items: [],
    };

    dispatch({ type: "ADD_LIST", value: newList });
    setActiveListId(newList.id);
    setOpenNewListDialog(false);
    setNewListName("");
    setNewListIcon("shopping_cart");
  }, [newListName, newListIcon, dispatch]);

  const handleDeleteList = useCallback((listId) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const confirmed = window.confirm(`Delete "${list.name}" list? This will permanently delete the list and all its items. This action cannot be undone.`);
    if (!confirmed) return;

    dispatch({ type: "REMOVE_LIST", value: listId });

    // Switch to another list if available
    const remainingLists = lists.filter(l => l.id !== listId);
    if (remainingLists.length > 0) {
      setActiveListId(remainingLists[0].id);
    } else {
      setActiveListId(null);
    }
  }, [lists, dispatch]);

  const handleAddItem = useCallback((e) => {
    e.preventDefault();
    if (!newItemText.trim() || !activeListId) return;

    const isGroceryList = activeList?.name.toLowerCase().includes("groceries");
    const category = isGroceryList ? categorizeItem(newItemText) : "Items";

    const newItem = {
      id: `item-${Date.now()}`,
      list_id: activeListId,
      text: newItemText.trim(),
      category,
      checked: false,
      checked_at: null,
      added_by: members.length > 0 ? members[0].id : null,
      sort_order: activeList?.items.length || 0,
    };

    dispatch({ type: "ADD_LIST_ITEM", value: { listId: activeListId, item: newItem } });
    setNewItemText("");
  }, [newItemText, activeListId, activeList, members, dispatch]);

  const handleToggleItem = useCallback((itemId) => {
    if (!activeListId) return;
    dispatch({ type: "TOGGLE_LIST_ITEM", value: { listId: activeListId, itemId } });
  }, [activeListId, dispatch]);

  const handleRemoveItem = useCallback((itemId) => {
    if (!activeListId) return;
    dispatch({ type: "REMOVE_LIST_ITEM", value: { listId: activeListId, itemId } });
  }, [activeListId, dispatch]);

  const handleClearCompleted = useCallback(() => {
    if (!activeList) return;

    const checkedItemIds = activeList.items.filter(item => item.checked).map(item => item.id);
    checkedItemIds.forEach(itemId => {
      dispatch({ type: "REMOVE_LIST_ITEM", value: { listId: activeListId, itemId } });
    });
  }, [activeList, activeListId, dispatch]);

  const getMemberById = useCallback((memberId) => {
    return members.find(m => m.id === memberId);
  }, [members]);

  return (
    <PageShell maxWidth={800}>
      {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Lists
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shared family lists
          </Typography>
        </Box>

        {/* List selector tabs */}
        <Box sx={{ mb: 3, display: "flex", gap: 1, overflowX: "auto", pb: 1 }}>
          {lists.map(list => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                onClick={() => setActiveListId(list.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: "19px",
                  background: activeListId === list.id
                    ? dark ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" : "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)"
                    : dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  color: activeListId === list.id ? "#fff" : "text.primary",
                  cursor: "pointer",
                  border: activeListId === list.id ? "none" : dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  },
                }}
              >
                <Icon sx={{ fontSize: "1.125rem" }}>{list.icon}</Icon>
                <Typography variant="body2" fontWeight={600}>
                  {list.name}
                </Typography>
                <Box
                  sx={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: "10px",
                    background: activeListId === list.id
                      ? "rgba(255,255,255,0.2)"
                      : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {list.items?.length || 0}
                </Box>
                {lists.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    sx={{
                      ml: 0.5,
                      p: 0.5,
                      color: "inherit",
                      opacity: 0.7,
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    <Icon sx={{ fontSize: "1rem" }}>close</Icon>
                  </IconButton>
                )}
              </Box>
            </motion.div>
          ))}

          {/* Add new list button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: lists.length * 0.05 }}
          >
            <IconButton
              onClick={() => setOpenNewListDialog(true)}
              sx={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                "&:hover": {
                  background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                  transform: "scale(1.05)",
                },
              }}
            >
              <Icon>add</Icon>
            </IconButton>
          </motion.div>
        </Box>

        {/* Active list content */}
        {activeList ? (
          <GlassCard sx={{ minHeight: 400 }}>
            {/* Clear completed button */}
            {checkedItemsCount > 0 && (
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  startIcon={<Icon>delete_sweep</Icon>}
                  onClick={handleClearCompleted}
                  sx={{
                    color: "text.secondary",
                    textTransform: "none",
                    "&:hover": { color: "error.main" },
                  }}
                >
                  Clear completed ({checkedItemsCount})
                </Button>
              </Box>
            )}

            {/* Items by category */}
            {Object.keys(categorizedItems).length > 0 ? (
              <AnimatePresence mode="popLayout">
                {Object.entries(categorizedItems).map(([category, items]) => (
                  <Box key={category} sx={{ mb: 3 }}>
                    {/* Category header */}
                    <Typography
                      variant="overline"
                      sx={{
                        fontSize: "0.65rem",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        mb: 1,
                        display: "block",
                      }}
                    >
                      {category}
                    </Typography>

                    {/* Items */}
                    {items.map((item, idx) => {
                      const member = getMemberById(item.added_by);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: idx * 0.02 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              py: 1,
                              px: 1.5,
                              borderBottom: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
                              opacity: item.checked ? 0.5 : 1,
                              transition: "all 0.2s ease",
                              "&:hover": {
                                background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                              },
                            }}
                          >
                            {/* Checkbox */}
                            <IconButton
                              size="small"
                              onClick={() => handleToggleItem(item.id)}
                              sx={{
                                color: item.checked ? "#7c3aed" : "text.secondary",
                                touchAction: "manipulation",
                              }}
                            >
                              <Icon>{item.checked ? "check_circle" : "radio_button_unchecked"}</Icon>
                            </IconButton>

                            {/* Item text */}
                            <Typography
                              variant="body2"
                              sx={{
                                flex: 1,
                                textDecoration: item.checked ? "line-through" : "none",
                                color: item.checked ? "text.secondary" : "text.primary",
                              }}
                            >
                              {item.text}
                            </Typography>

                            {/* Member avatar dot */}
                            {member && (
                              <Avatar
                                sx={{
                                  width: 20,
                                  height: 20,
                                  fontSize: "0.65rem",
                                  bgcolor: member.avatar_color || "#7c3aed",
                                }}
                              >
                                {member.avatar_emoji || member.name?.charAt(0) || "?"}
                              </Avatar>
                            )}

                            {/* Delete button (visible on hover for checked items) */}
                            {item.checked && (
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveItem(item.id)}
                                sx={{
                                  opacity: 0.5,
                                  "&:hover": { opacity: 1, color: "error.main" },
                                }}
                              >
                                <Icon sx={{ fontSize: "1rem" }}>close</Icon>
                              </IconButton>
                            )}
                          </Box>
                        </motion.div>
                      );
                    })}
                  </Box>
                ))}
              </AnimatePresence>
            ) : (
              // Empty state
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  color: "text.secondary",
                }}
              >
                <Icon sx={{ fontSize: "3rem", mb: 2, opacity: 0.3 }}>checklist</Icon>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  List is empty
                </Typography>
                <Typography variant="body2">
                  Add items below
                </Typography>
              </Box>
            )}

            {/* Add item input (sticky at bottom) */}
            <Box
              component="form"
              onSubmit={handleAddItem}
              sx={{
                position: "sticky",
                bottom: 0,
                mt: 2,
                pt: 2,
                borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                background: dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      background: dark ? "rgba(255,255,255,0.05)" : "#fff",
                    },
                  }}
                />
                <IconButton
                  type="submit"
                  sx={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    color: "#fff",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
                    },
                    "&:disabled": {
                      opacity: 0.5,
                    },
                  }}
                  disabled={!newItemText.trim()}
                >
                  <Icon>add</Icon>
                </IconButton>
              </Box>
            </Box>
          </GlassCard>
        ) : null}

        {/* New List SlidePanel */}
        <SlidePanel
          open={openNewListDialog}
          onClose={() => setOpenNewListDialog(false)}
          title="Create New List"
          icon="add"
          width={420}
          actions={
            <>
              <Button onClick={() => setOpenNewListDialog(false)} variant="outlined" sx={{ borderRadius: "12px", textTransform: "none" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                sx={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  color: "#fff",
                  textTransform: "none",
                  borderRadius: "12px",
                  px: 3,
                  "&:hover": {
                    background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
                  },
                }}
              >
                Create
              </Button>
            </>
          }
        >
          <TextField
            fullWidth
            label="List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            autoFocus
          />

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Choose Icon
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {LIST_ICONS.map(iconOption => (
                <IconButton
                  key={iconOption.value}
                  onClick={() => setNewListIcon(iconOption.value)}
                  sx={{
                    width: 48,
                    height: 48,
                    border: newListIcon === iconOption.value
                      ? "2px solid #7c3aed"
                      : dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                    background: newListIcon === iconOption.value
                      ? "rgba(124,58,237,0.1)"
                      : "transparent",
                    "&:hover": {
                      background: "rgba(124,58,237,0.15)",
                    },
                  }}
                >
                  <Icon>{iconOption.value}</Icon>
                </IconButton>
              ))}
            </Box>
          </Box>
        </SlidePanel>
    </PageShell>
  );
}
