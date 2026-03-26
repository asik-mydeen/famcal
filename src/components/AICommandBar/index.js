import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { sendAIMessage, buildAIContext } from "lib/ai";

// Action badge config: icon + color per action category
const ACTION_BADGES = {
  create_event: { icon: "calendar_today", color: "#6C5CE7", label: "event created" },
  update_event: { icon: "edit_calendar", color: "#6C5CE7", label: "event updated" },
  remove_event: { icon: "event_busy", color: "#E17055", label: "event removed" },
  create_task: { icon: "task_alt", color: "#00B894", label: "task created" },
  update_task: { icon: "edit_note", color: "#00B894", label: "task updated" },
  complete_task: { icon: "check_circle", color: "#22c55e", label: "task completed" },
  remove_task: { icon: "delete", color: "#E17055", label: "task removed" },
  add_meal: { icon: "restaurant", color: "#E17055", label: "meal added" },
  update_meal: { icon: "restaurant", color: "#E17055", label: "meal updated" },
  remove_meal: { icon: "delete", color: "#E17055", label: "meal removed" },
  create_list: { icon: "checklist", color: "#0984E3", label: "list created" },
  add_list_items: { icon: "add_shopping_cart", color: "#0984E3", label: "items added" },
  toggle_list_item: { icon: "check_box", color: "#0984E3", label: "item toggled" },
  remove_list_item: { icon: "delete", color: "#E17055", label: "item removed" },
  add_note: { icon: "sticky_note_2", color: "#FDCB6E", label: "note added" },
  remove_note: { icon: "delete", color: "#E17055", label: "note removed" },
  add_countdown: { icon: "timer", color: "#6C5CE7", label: "countdown created" },
  remove_countdown: { icon: "delete", color: "#E17055", label: "countdown removed" },
  add_reward: { icon: "emoji_events", color: "#FDCB6E", label: "reward created" },
  claim_reward: { icon: "redeem", color: "#22c55e", label: "reward claimed" },
};

function AICommandBar({ familyId, dispatch, state, currentPage, externalOpen, onExternalClose }) {
  const { darkMode } = useThemeMode();
  const [open, setOpen] = useState(false);

  // Support external open trigger (from SpeedDial in App.js)
  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [externalOpen]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const lists = state?.lists || [];

  // Build context for AI
  const aiContext = useMemo(
    () => (state ? buildAIContext(state, currentPage) : {}),
    [state, currentPage]
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    setMessages([]);
    if (onExternalClose) onExternalClose();
  };

  // Execute ALL action types
  const executeActions = useCallback(
    (actions) => {
      if (!actions || actions.length === 0) return [];
      const executed = [];

      for (const action of actions) {
        const d = action.data || {};
        switch (action.type) {
          case "create_event":
            dispatch({
              type: "ADD_EVENT",
              value: {
                id: crypto.randomUUID(),
                family_id: familyId,
                member_id: d.member_id || null,
                title: d.title,
                start: d.start,
                end: d.end || d.start,
                allDay: d.allDay || false,
                className: "info",
                source: "manual",
                google_event_id: null,
              },
            });
            executed.push(action.type);
            break;

          case "update_event":
            dispatch({
              type: "UPDATE_EVENT",
              value: {
                id: d.event_id,
                ...(d.title && { title: d.title }),
                ...(d.start && { start: d.start }),
                ...(d.end && { end: d.end }),
                ...(d.member_id && { member_id: d.member_id }),
                ...(d.allDay !== undefined && { allDay: d.allDay }),
              },
            });
            executed.push(action.type);
            break;

          case "remove_event":
            dispatch({ type: "REMOVE_EVENT", value: d.event_id });
            executed.push(action.type);
            break;

          case "create_task":
            dispatch({
              type: "ADD_TASK",
              value: {
                id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                title: d.title,
                description: d.description || "",
                assigned_to: d.assigned_to || null,
                due_date: d.due_date || new Date().toISOString().split("T")[0],
                due_time: d.due_time || "",
                recurring: d.recurring || false,
                recurring_pattern: d.recurring_pattern || "daily",
                points_value: d.points_value || 10,
                completed: false,
                category: d.category || "chores",
                priority: d.priority || "medium",
              },
            });
            executed.push(action.type);
            break;

          case "update_task":
            dispatch({
              type: "UPDATE_TASK",
              value: { id: d.task_id, ...d },
            });
            executed.push(action.type);
            break;

          case "complete_task":
            dispatch({
              type: "COMPLETE_TASK",
              value: { id: d.task_id, completed_by: d.completed_by },
            });
            executed.push(action.type);
            break;

          case "remove_task":
            dispatch({ type: "REMOVE_TASK", value: d.task_id });
            executed.push(action.type);
            break;

          case "add_meal":
            dispatch({
              type: "ADD_MEAL",
              value: {
                id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                date: d.date,
                meal_type: d.meal_type,
                title: d.title,
                notes: d.notes || "",
              },
            });
            executed.push(action.type);
            break;

          case "update_meal":
            dispatch({
              type: "UPDATE_MEAL",
              value: { id: d.meal_id, ...d },
            });
            executed.push(action.type);
            break;

          case "remove_meal":
            dispatch({ type: "REMOVE_MEAL", value: d.meal_id });
            executed.push(action.type);
            break;

          case "create_list":
            dispatch({
              type: "ADD_LIST",
              value: {
                id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                name: d.name,
                icon: d.icon || "checklist",
                sort_order: 0,
              },
            });
            executed.push(action.type);
            break;

          case "add_list_items": {
            const target = lists.find((l) =>
              l.name.toLowerCase().includes((d.list_name || "groceries").toLowerCase())
            );
            if (target) {
              for (const itemText of d.items || []) {
                dispatch({
                  type: "ADD_LIST_ITEM",
                  value: {
                    listId: target.id,
                    item: {
                      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      list_id: target.id,
                      text: itemText,
                      category: "Other",
                      checked: false,
                      sort_order: 0,
                      created_at: new Date().toISOString(),
                    },
                  },
                });
              }
              executed.push(action.type);
            }
            break;
          }

          case "toggle_list_item":
            dispatch({
              type: "TOGGLE_LIST_ITEM",
              value: { listId: d.list_id, itemId: d.item_id },
            });
            executed.push(action.type);
            break;

          case "remove_list_item":
            dispatch({
              type: "REMOVE_LIST_ITEM",
              value: { listId: d.list_id, itemId: d.item_id },
            });
            executed.push(action.type);
            break;

          case "add_note":
            dispatch({
              type: "ADD_NOTE",
              value: {
                id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                text: d.text,
                member_id: d.member_id || null,
                pinned: d.pinned || false,
              },
            });
            executed.push(action.type);
            break;

          case "remove_note":
            dispatch({ type: "REMOVE_NOTE", value: d.note_id });
            executed.push(action.type);
            break;

          case "add_countdown":
            dispatch({
              type: "ADD_COUNTDOWN",
              value: {
                id: `cd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                title: d.title,
                target_date: d.target_date,
                icon: d.icon || "event",
                color: d.color || "#6C5CE7",
              },
            });
            executed.push(action.type);
            break;

          case "remove_countdown":
            dispatch({ type: "REMOVE_COUNTDOWN", value: d.countdown_id });
            executed.push(action.type);
            break;

          case "add_reward":
            dispatch({
              type: "ADD_REWARD",
              value: {
                id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                family_id: familyId,
                title: d.title,
                description: d.description || "",
                points_cost: d.points_cost || 50,
                icon: d.icon || "card_giftcard",
              },
            });
            executed.push(action.type);
            break;

          case "claim_reward":
            dispatch({
              type: "CLAIM_REWARD",
              value: { rewardId: d.reward_id, memberId: d.member_id },
            });
            executed.push(action.type);
            break;

          case "info":
          default:
            break;
        }
      }

      return executed;
    },
    [dispatch, familyId, lists]
  );

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);

    // Send conversation history to API
    const apiMessages = newMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await sendAIMessage(apiMessages, aiContext);

    // Execute actions
    let executedTypes = [];
    if (result.actions?.length > 0) {
      executedTypes = executeActions(result.actions);
    }

    setMessages([
      ...newMessages,
      {
        role: "assistant",
        content: result.reply,
        actions: result.actions || [],
        executedTypes,
      },
    ]);
    setLoading(false);

    // Auto-scroll to bottom
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") handleClose();
  };

  const handleSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const suggestions = [
    "Add dentist appointment for Mom on Friday at 2pm",
    "What's for dinner tonight?",
    "Give Aarish a chore to clean his room, 20 points",
    "Add milk, eggs, and bread to the grocery list",
    "How many points does Aarish have?",
    "Mark the dishes chore as done for Mom",
  ];

  return (
    <>
      {/* Command bar overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1400,
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Command bar panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                bottom: "15%",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1500,
                width: "92%",
                maxWidth: 580,
              }}
            >
              <Box
                sx={{
                  background: darkMode ? "rgba(15,15,35,0.97)" : "#ffffff",
                  backdropFilter: "blur(20px)",
                  borderRadius: "20px",
                  boxShadow: darkMode
                    ? "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
                    : "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "60vh",
                }}
              >
                {/* Conversation area */}
                {messages.length > 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "auto",
                      px: 2,
                      pt: 2,
                      pb: 1,
                      maxHeight: "40vh",
                    }}
                  >
                    {messages.map((msg, i) => (
                      <Box key={i} sx={{ mb: 1.5 }}>
                        {msg.role === "user" ? (
                          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Box
                              sx={{
                                px: 2,
                                py: 1,
                                borderRadius: "14px 14px 4px 14px",
                                background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                                color: "#fff",
                                fontSize: "0.88rem",
                                maxWidth: "85%",
                              }}
                            >
                              {msg.content}
                            </Box>
                          </Box>
                        ) : (
                          <Box>
                            <Box
                              sx={{
                                px: 2,
                                py: 1,
                                borderRadius: "14px 14px 14px 4px",
                                background: darkMode
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.04)",
                                fontSize: "0.88rem",
                                lineHeight: 1.6,
                                maxWidth: "85%",
                                color: "text.primary",
                              }}
                            >
                              {msg.content}
                            </Box>

                            {/* Action badges */}
                            {msg.executedTypes?.length > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.5,
                                  flexWrap: "wrap",
                                  mt: 0.75,
                                }}
                              >
                                {msg.executedTypes.map((type, j) => {
                                  const badge = ACTION_BADGES[type] || {
                                    icon: "check",
                                    color: "#6C5CE7",
                                    label: type,
                                  };
                                  return (
                                    <Box
                                      key={j}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        px: 1.5,
                                        py: 0.4,
                                        borderRadius: "8px",
                                        background: `${badge.color}15`,
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        color: badge.color,
                                      }}
                                    >
                                      <Icon sx={{ fontSize: "0.85rem" }}>
                                        {badge.icon}
                                      </Icon>
                                      {badge.label}
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}

                    {/* Loading indicator */}
                    {loading && (
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                        <CircularProgress size={14} sx={{ color: "primary.main" }} />
                        <Typography
                          sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                        >
                          Thinking...
                        </Typography>
                      </Box>
                    )}
                    <div ref={scrollRef} />
                  </Box>
                )}

                {/* Input area */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 2,
                    borderTop:
                      messages.length > 0
                        ? `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                        : "none",
                  }}
                >
                  <Icon
                    sx={{
                      color: "primary.main",
                      fontSize: "1.3rem",
                      animation: loading ? "pulse 1.5s ease infinite" : "none",
                      "@keyframes pulse": {
                        "0%,100%": { opacity: 1 },
                        "50%": { opacity: 0.4 },
                      },
                    }}
                  >
                    auto_awesome
                  </Icon>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      messages.length > 0
                        ? "Follow up..."
                        : "Ask AI anything... (Cmd+K)"
                    }
                    disabled={loading}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "1rem",
                      fontFamily: "Inter, sans-serif",
                      color: darkMode ? "#fff" : "#1A1A1A",
                    }}
                  />
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "primary.main" }} />
                  ) : input.trim() ? (
                    <IconButton
                      size="small"
                      onClick={handleSubmit}
                      sx={{ color: "primary.main" }}
                    >
                      <Icon>send</Icon>
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={handleClose}
                      sx={{ color: "text.secondary" }}
                    >
                      <Icon>close</Icon>
                    </IconButton>
                  )}
                </Box>

                {/* Suggestions (only when empty conversation) */}
                {messages.length === 0 && !input && (
                  <Box
                    sx={{
                      borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        mb: 0.75,
                      }}
                    >
                      Try saying
                    </Typography>
                    {suggestions.map((s) => (
                      <Box
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        sx={{
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          color: "text.secondary",
                          "&:hover": {
                            background: darkMode
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(0,0,0,0.03)",
                            color: "text.primary",
                          },
                          transition: "all 0.15s ease",
                        }}
                      >
                        {s}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

AICommandBar.propTypes = {
  familyId: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  state: PropTypes.object,
  currentPage: PropTypes.string,
  externalOpen: PropTypes.bool,
  onExternalClose: PropTypes.func,
};

export default AICommandBar;
