import { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { sendAIMessage } from "lib/ai";

function AICommandBar({ members, familyId, dispatch, lists }) {
  const { darkMode } = useThemeMode();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [actionsExecuted, setActionsExecuted] = useState(false);
  const inputRef = useRef(null);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    setResponse(null);
    setActionsExecuted(false);
  };

  const executeActions = useCallback((actions) => {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      switch (action.type) {
        case "create_event": {
          const d = action.data;
          dispatch({
            type: "ADD_EVENT",
            value: {
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
          break;
        }
        case "create_task": {
          const d = action.data;
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
          break;
        }
        case "add_meal": {
          const d = action.data;
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
          break;
        }
        case "add_list_items": {
          const d = action.data;
          const targetList = lists?.find(l => l.name.toLowerCase().includes((d.list_name || "groceries").toLowerCase()));
          if (targetList) {
            for (const itemText of (d.items || [])) {
              dispatch({
                type: "ADD_LIST_ITEM",
                value: {
                  listId: targetList.id,
                  item: {
                    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    list_id: targetList.id,
                    text: itemText,
                    category: "Other",
                    checked: false,
                    sort_order: 0,
                    created_at: new Date().toISOString(),
                  },
                },
              });
            }
          }
          break;
        }
        default:
          break;
      }
    }
    setActionsExecuted(true);
  }, [dispatch, familyId, lists]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setActionsExecuted(false);

    const context = {
      members: members?.map(m => ({ name: m.name, id: m.id })) || [],
    };

    const result = await sendAIMessage(input.trim(), context);
    setResponse(result);
    setLoading(false);

    // Auto-execute actions
    if (result.actions && result.actions.length > 0) {
      executeActions(result.actions);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") handleClose();
  };

  // Count action types for display
  const actionSummary = response?.actions?.reduce((acc, a) => {
    if (a.type === "create_event") acc.events = (acc.events || 0) + 1;
    if (a.type === "create_task") acc.tasks = (acc.tasks || 0) + 1;
    if (a.type === "add_meal") acc.meals = (acc.meals || 0) + 1;
    if (a.type === "add_list_items") acc.items = (acc.items || 0) + (a.data?.items?.length || 0);
    return acc;
  }, {});

  return (
    <>
      {/* Floating AI button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ position: "fixed", bottom: 90, right: 20, zIndex: 1300 }}
          >
            <IconButton
              onClick={handleOpen}
              sx={{
                width: 56, height: 56,
                background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                color: "#fff",
                boxShadow: "0 6px 24px rgba(108,92,231,0.4)",
                "&:hover": { boxShadow: "0 8px 32px rgba(108,92,231,0.6)", transform: "scale(1.05)" },
                transition: "all 0.2s ease",
              }}
            >
              <Icon sx={{ fontSize: "1.5rem" }}>auto_awesome</Icon>
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

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
                position: "fixed", inset: 0, zIndex: 1400,
                background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
              }}
            />

            {/* Command bar */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                bottom: "30%", left: "50%", transform: "translateX(-50%)",
                zIndex: 1500, width: "90%", maxWidth: 560,
              }}
            >
              <Box sx={{
                background: darkMode ? "rgba(15,15,35,0.97)" : "#ffffff",
                backdropFilter: "blur(20px)",
                borderRadius: "20px",
                boxShadow: darkMode
                  ? "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
                  : "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}>
                {/* Input area */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                  <Icon sx={{
                    color: "primary.main", fontSize: "1.3rem",
                    animation: loading ? "pulse 1.5s ease infinite" : "none",
                    "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
                  }}>
                    auto_awesome
                  </Icon>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI anything... (e.g., 'Add dentist for Mom on Friday at 2pm')"
                    disabled={loading}
                    style={{
                      flex: 1, border: "none", outline: "none",
                      background: "transparent",
                      fontSize: "1rem", fontFamily: "Inter, sans-serif",
                      color: darkMode ? "#fff" : "#1A1A1A",
                    }}
                  />
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "primary.main" }} />
                  ) : input.trim() ? (
                    <IconButton size="small" onClick={handleSubmit} sx={{ color: "primary.main" }}>
                      <Icon>send</Icon>
                    </IconButton>
                  ) : (
                    <IconButton size="small" onClick={handleClose} sx={{ color: "text.secondary" }}>
                      <Icon>close</Icon>
                    </IconButton>
                  )}
                </Box>

                {/* Response area */}
                <AnimatePresence>
                  {response && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <Box sx={{
                        borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                        p: 2,
                      }}>
                        {/* AI reply */}
                        <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.6, mb: 1, color: "text.primary" }}>
                          {response.reply}
                        </Typography>

                        {/* Action badges */}
                        {actionSummary && Object.keys(actionSummary).length > 0 && (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                            {actionSummary.events && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "8px", background: "rgba(108,92,231,0.1)", fontSize: "0.75rem", fontWeight: 600, color: "#6C5CE7" }}>
                                <Icon sx={{ fontSize: "0.85rem" }}>calendar_today</Icon>
                                {actionSummary.events} event{actionSummary.events > 1 ? "s" : ""} created
                              </Box>
                            )}
                            {actionSummary.tasks && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "8px", background: "rgba(0,184,148,0.1)", fontSize: "0.75rem", fontWeight: 600, color: "#00B894" }}>
                                <Icon sx={{ fontSize: "0.85rem" }}>task_alt</Icon>
                                {actionSummary.tasks} task{actionSummary.tasks > 1 ? "s" : ""} created
                              </Box>
                            )}
                            {actionSummary.meals && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "8px", background: "rgba(225,112,85,0.1)", fontSize: "0.75rem", fontWeight: 600, color: "#E17055" }}>
                                <Icon sx={{ fontSize: "0.85rem" }}>restaurant</Icon>
                                {actionSummary.meals} meal{actionSummary.meals > 1 ? "s" : ""} added
                              </Box>
                            )}
                            {actionSummary.items && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "8px", background: "rgba(9,132,227,0.1)", fontSize: "0.75rem", fontWeight: 600, color: "#0984E3" }}>
                                <Icon sx={{ fontSize: "0.85rem" }}>checklist</Icon>
                                {actionSummary.items} item{actionSummary.items > 1 ? "s" : ""} added to list
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* Done indicator */}
                        {actionsExecuted && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1.5, color: "#00B894", fontSize: "0.8rem", fontWeight: 600 }}>
                            <Icon sx={{ fontSize: "1rem" }}>check_circle</Icon>
                            Done! Changes applied.
                          </Box>
                        )}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Suggestions (when no input and no response) */}
                {!response && !input && (
                  <Box sx={{
                    borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    px: 2, py: 1.5,
                  }}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, mb: 1 }}>
                      Try saying
                    </Typography>
                    {[
                      "Add dentist appointment for Mom on Friday at 2pm",
                      "Suggest 5 dinner ideas for this week",
                      "Add milk, eggs, and bread to the grocery list",
                      "Create a chore for Aarish to clean his room",
                    ].map((suggestion) => (
                      <Box
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        sx={{
                          py: 0.75, px: 1, borderRadius: "8px", cursor: "pointer",
                          fontSize: "0.82rem", color: "text.secondary",
                          "&:hover": { background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", color: "text.primary" },
                          transition: "all 0.15s ease",
                        }}
                      >
                        {suggestion}
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
  members: PropTypes.array,
  familyId: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  lists: PropTypes.array,
};

export default AICommandBar;
