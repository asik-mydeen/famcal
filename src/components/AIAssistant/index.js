import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
// CircularProgress replaced by TypingIndicator
import { AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { sendAIMessage, buildAIContext } from "lib/ai";
import SlidePanel from "components/SlidePanel";
import { getDynamicSuggestions } from "lib/aiSuggestions";

// Import sub-components (will be created by agent)
import MemoryChip from "./MemoryChip";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import SuggestionPill from "./SuggestionPill";


function AIAssistant({ familyId, dispatch, state, currentPage, externalOpen, onExternalClose }) {
  const { darkMode } = useThemeMode();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Get AI state from context
  const aiPreferences = state?.ai_preferences || { assistant_name: "Amara" };
  const conversations = state?.conversations || [];
  const activeConversation = state?.activeConversation || null;
  const memories = state?.memories || [];
  const lists = state?.lists || [];

  // Build context for AI (with preferences + memories)
  const aiContext = useMemo(
    () => (state ? buildAIContext(state, currentPage) : {}),
    [state, currentPage]
  );

  // Dynamic suggestions based on time, page, activity
  const suggestions = useMemo(() => {
    return getDynamicSuggestions(currentPage, state);
  }, [currentPage, state]);

  // Support external open trigger (from SpeedDial in App.js)
  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [externalOpen]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to toggle
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
    // Load or create active conversation
    if (!activeConversation && conversations.length > 0) {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: conversations[0] });
    } else if (!activeConversation) {
      // Create new conversation
      const newConv = { id: `conv-${Date.now()}`, messages: [], title: null };
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: newConv });
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    if (onExternalClose) onExternalClose();
  };

  const handleNewChat = () => {
    const newConv = { id: `conv-${Date.now()}`, messages: [], title: null };
    dispatch({ type: "SET_ACTIVE_CONVERSATION", value: newConv });
    setInput("");
  };

  const handleSelectConversation = (conversation) => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", value: conversation });
    setConversationMenuAnchor(null);
  };

  // Execute actions (copied from AICommandBar, simplified)
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
                id: `event-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "update_event":
            dispatch({ type: "UPDATE_EVENT", value: d });
            executed.push(action.type);
            break;
          case "remove_event":
            dispatch({ type: "REMOVE_EVENT", value: { id: d.event_id } });
            executed.push(action.type);
            break;
          case "create_task":
            dispatch({
              type: "ADD_TASK",
              value: {
                id: `task-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "update_task":
            dispatch({ type: "UPDATE_TASK", value: d });
            executed.push(action.type);
            break;
          case "complete_task":
            dispatch({ type: "COMPLETE_TASK", value: d });
            executed.push(action.type);
            break;
          case "remove_task":
            dispatch({ type: "REMOVE_TASK", value: { id: d.task_id } });
            executed.push(action.type);
            break;
          case "add_meal":
            dispatch({
              type: "ADD_MEAL",
              value: {
                id: `meal-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "update_meal":
            dispatch({ type: "UPDATE_MEAL", value: d });
            executed.push(action.type);
            break;
          case "remove_meal":
            dispatch({ type: "REMOVE_MEAL", value: { id: d.meal_id } });
            executed.push(action.type);
            break;
          case "create_list":
            dispatch({
              type: "ADD_LIST",
              value: {
                id: `list-${Date.now()}`,
                family_id: familyId,
                items: [],
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "add_list_items":
            // Find list by name (fuzzy match)
            const targetList = lists.find(
              (l) => l.name.toLowerCase() === d.list_name?.toLowerCase()
            );
            if (targetList) {
              const items = Array.isArray(d.items) ? d.items : [d.items];
              items.forEach((itemText) => {
                dispatch({
                  type: "ADD_LIST_ITEM",
                  value: {
                    listId: targetList.id,
                    item: {
                      id: `item-${Date.now()}-${Math.random()}`,
                      text: itemText,
                      checked: false,
                    },
                  },
                });
              });
              executed.push(action.type);
            }
            break;
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
                id: `note-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "remove_note":
            dispatch({ type: "REMOVE_NOTE", value: { id: d.note_id } });
            executed.push(action.type);
            break;
          case "add_countdown":
            dispatch({
              type: "ADD_COUNTDOWN",
              value: {
                id: `countdown-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "remove_countdown":
            dispatch({ type: "REMOVE_COUNTDOWN", value: { id: d.countdown_id } });
            executed.push(action.type);
            break;
          case "add_reward":
            dispatch({
              type: "ADD_REWARD",
              value: {
                id: `reward-${Date.now()}`,
                family_id: familyId,
                ...d,
              },
            });
            executed.push(action.type);
            break;
          case "claim_reward":
            dispatch({ type: "CLAIM_REWARD", value: d });
            executed.push(action.type);
            break;
          case "info":
            // No action, just informational response
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      }

      return executed;
    },
    [dispatch, familyId, lists]
  );

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    dispatch({
      type: "ADD_MESSAGE",
      value: { conversationId: activeConversation?.id, message: userMessage },
    });

    setInput("");
    setLoading(true);

    try {
      const response = await sendAIMessage(
        [...(activeConversation?.messages || []), userMessage],
        aiContext,
        aiPreferences,
        memories
      );

      const executed = executeActions(response.actions || []);

      const assistantMessage = {
        role: "assistant",
        content: response.reply,
        actions: response.actions || [],
        executedTypes: executed,
      };

      dispatch({
        type: "ADD_MESSAGE",
        value: { conversationId: activeConversation?.id, message: assistantMessage },
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("AI request failed:", error);
      const errorMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message || "Please try again."}`,
        actions: [],
        executedTypes: [],
      };
      dispatch({
        type: "ADD_MESSAGE",
        value: { conversationId: activeConversation?.id, message: errorMessage },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDismissMemory = (memoryId) => {
    dispatch({ type: "UPDATE_MEMORY", value: { id: memoryId, active: false } });
  };

  // Render header with conversation selector + new chat button
  const renderHeader = () => (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon sx={{ fontSize: "1.2rem" }}>auto_awesome</Icon>
        <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>
          {aiPreferences.assistant_name || "Amara"}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={(e) => setConversationMenuAnchor(e.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <Icon sx={{ fontSize: "1.1rem" }}>history</Icon>
        </IconButton>
        <IconButton size="small" onClick={handleNewChat} sx={{ color: "text.secondary" }}>
          <Icon sx={{ fontSize: "1.1rem" }}>add</Icon>
        </IconButton>
      </Box>
    </Box>
  );

  // Render active memories
  const renderMemories = () => {
    const activeMemories = memories.filter((m) => m.active);
    if (activeMemories.length === 0) return null;

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, px: 3, pt: 2 }}>
        {activeMemories.slice(0, 3).map((memory) => (
          <MemoryChip key={memory.id} memory={memory} onDismiss={handleDismissMemory} />
        ))}
      </Box>
    );
  };

  // Render chat messages
  const renderMessages = () => {
    const messages = activeConversation?.messages || [];
    if (messages.length === 0) return null;

    return (
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: "auto",
          px: 3,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={`${activeConversation.id}-${idx}`}
              role={msg.role}
              content={msg.content}
              actions={msg.actions}
              timestamp={msg.timestamp || new Date()}
              onNavigate={(page) => { navigate(page); handleClose(); }}
            />
          ))}
        </AnimatePresence>
        {loading && <TypingIndicator />}
      </Box>
    );
  };

  // Render suggestions (only if no messages)
  const renderSuggestions = () => {
    if (activeConversation?.messages?.length > 0) return null;

    return (
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {/* Welcome message */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          p: 2, borderRadius: "14px",
          background: darkMode ? "rgba(108,92,231,0.08)" : "rgba(108,92,231,0.04)",
          border: `1px solid ${darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)"}`,
          width: "100%",
        }}>
          <Icon sx={{ color: "#6C5CE7", fontSize: "1.4rem" }}>auto_awesome</Icon>
          <Typography sx={{ fontSize: "0.88rem", color: "text.secondary", lineHeight: 1.5 }}>
            Hi! I&apos;m <strong>{aiPreferences.assistant_name || "Amara"}</strong>, your family assistant.
            I can plan meals, manage chores, update your calendar, and more.
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", fontWeight: 500 }}>
          Try asking
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {suggestions.map((sug, idx) => (
            <SuggestionPill
              key={idx}
              icon={sug.icon}
              label={sug.label}
              onClick={() => handleSuggestionClick(sug.prompt)}
            />
          ))}
        </Box>
      </Box>
    );
  };

  // Render input bar
  const renderInput = () => (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        display: "flex",
        gap: 1,
        alignItems: "flex-end",
      }}
    >
      <TextField
        inputRef={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask me anything..."
        multiline
        maxRows={4}
        fullWidth
        disabled={loading}
        sx={{
          "& .MuiInputBase-root": {
            borderRadius: "12px",
            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          },
        }}
      />
      <IconButton
        onClick={handleSubmit}
        disabled={!input.trim() || loading}
        sx={{
          background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
          color: "#fff",
          "&:hover": { background: "linear-gradient(135deg, #5B4CD6, #9189ED)" },
          "&.Mui-disabled": { background: "rgba(108,92,231,0.3)", color: "rgba(255,255,255,0.3)" },
        }}
      >
        <Icon>send</Icon>
      </IconButton>
    </Box>
  );

  return (
    <>
      <SlidePanel open={open} onClose={handleClose} width={420} title="" subtitle="">
        {/* Custom header (overrides SlidePanel's default) */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            px: 3,
            py: 2.5,
            borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: darkMode ? "rgba(10,10,26,0.98)" : "#ffffff",
            zIndex: 10,
          }}
        >
          {renderHeader()}
        </Box>

        {/* Memories */}
        {renderMemories()}

        {/* Messages or Suggestions */}
        {activeConversation?.messages?.length > 0 ? renderMessages() : renderSuggestions()}

        {/* Spacer to push input to bottom */}
        <Box sx={{ flex: 1 }} />

        {/* Input bar */}
        {renderInput()}
      </SlidePanel>

      {/* Conversation history menu */}
      <Menu
        anchorEl={conversationMenuAnchor}
        open={Boolean(conversationMenuAnchor)}
        onClose={() => setConversationMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 300,
            width: 280,
            background: darkMode ? "rgba(10,10,26,0.98)" : "#ffffff",
            backdropFilter: "blur(20px)",
          },
        }}
      >
        {conversations.length === 0 ? (
          <MenuItem disabled>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              No recent chats
            </Typography>
          </MenuItem>
        ) : (
          conversations.slice(0, 10).map((conv) => (
            <MenuItem key={conv.id} onClick={() => handleSelectConversation(conv)}>
              <Box>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  {conv.title || "Untitled conversation"}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  {conv.message_count || 0} messages
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}

AIAssistant.propTypes = {
  familyId: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  state: PropTypes.object,
  currentPage: PropTypes.string,
  externalOpen: PropTypes.bool,
  onExternalClose: PropTypes.func,
};

export default AIAssistant;
