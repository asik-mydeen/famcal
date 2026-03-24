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
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { sendAIMessage, buildAIContext } from "lib/ai";
import SlidePanel from "components/SlidePanel";
import { getDynamicSuggestions } from "lib/aiSuggestions";

// Import sub-components
import MemoryChip from "./MemoryChip";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import SuggestionPill from "./SuggestionPill";

// Action summary labels for building human-readable summaries
const ACTION_SUMMARY_LABELS = {
  create_event: "event",
  update_event: "event update",
  remove_event: "event removal",
  create_task: "task",
  update_task: "task update",
  complete_task: "task completion",
  remove_task: "task removal",
  add_meal: "meal",
  update_meal: "meal update",
  remove_meal: "meal removal",
  create_list: "list",
  add_list_items: "item",
  toggle_list_item: "item toggle",
  remove_list_item: "item removal",
  add_note: "note",
  remove_note: "note removal",
  add_countdown: "countdown",
  remove_countdown: "countdown removal",
  add_reward: "reward",
  claim_reward: "reward claim",
};

// Build a human-readable summary of executed actions (e.g. "3 meals added, 2 items added")
function buildActionSummary(executedTypes) {
  if (!executedTypes || executedTypes.length === 0) return null;

  const counts = {};
  executedTypes.forEach((type) => {
    const label = ACTION_SUMMARY_LABELS[type] || type.replace(/_/g, " ");
    counts[label] = (counts[label] || 0) + 1;
  });

  const parts = Object.entries(counts).map(
    ([label, count]) => `${count} ${label}${count > 1 ? "s" : ""}`
  );

  return parts.join(", ");
}

// Voice input hook — wraps the Web Speech API
function useVoiceInput({ onResult }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && onResult) {
          onResult(transcript);
        }
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onResult]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !listening) {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // Already started or not allowed
        setListening(false);
      }
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, [listening]);

  return { listening, supported, startListening, stopListening };
}


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

  const assistantName = aiPreferences.assistant_name || "Amara";

  // Build context for AI (with preferences + memories)
  const aiContext = useMemo(
    () => (state ? buildAIContext(state, currentPage) : {}),
    [state, currentPage]
  );

  // Dynamic suggestions based on time, page, activity
  const suggestions = useMemo(() => {
    return getDynamicSuggestions(currentPage, state);
  }, [currentPage, state]);

  // Voice input
  const handleVoiceResult = useCallback((transcript) => {
    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    inputRef.current?.focus();
  }, []);

  const { listening, supported: voiceSupported, startListening, stopListening } =
    useVoiceInput({ onResult: handleVoiceResult });

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

  const handleClearChat = () => {
    handleNewChat();
  };

  const handleSelectConversation = async (conversation) => {
    setConversationMenuAnchor(null);
    // Fetch messages from Supabase for this conversation
    try {
      const { fetchMessages } = await import("lib/supabase");
      const messages = await fetchMessages(conversation.id);
      dispatch({
        type: "SET_ACTIVE_CONVERSATION",
        value: { ...conversation, messages: messages || [] },
      });
    } catch (e) {
      console.warn("[ai] Failed to load conversation messages:", e);
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: { ...conversation, messages: [] } });
    }
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
          case "add_list_items": {
            // Find list by name OR by id (AI may send either)
            const targetList = lists.find(
              (l) => (d.list_name && l.name.toLowerCase() === d.list_name.toLowerCase()) ||
                     (d.list_id && l.id === d.list_id)
            ) || lists.find((l) => l.name.toLowerCase().includes("grocer"));
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
      console.log("[ai-send] Preferences being sent:", JSON.stringify({
        cuisine: aiPreferences?.cuisine_preferences,
        dietary: aiPreferences?.dietary_restrictions,
        servings: aiPreferences?.servings,
        name: aiPreferences?.assistant_name,
      }));
      const response = await sendAIMessage(
        [...(activeConversation?.messages || []), userMessage],
        aiContext,
        aiPreferences,
        memories
      );

      const executed = executeActions(response.actions || []);

      // Build action summary for display
      const summary = buildActionSummary(executed);

      const assistantMessage = {
        role: "assistant",
        content: response.reply,
        actions: response.actions || [],
        executedTypes: executed,
        actionSummary: summary,
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
          minHeight: 0,
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
            <Box key={`${activeConversation.id}-${idx}`}>
              <MessageBubble
                role={msg.role}
                content={msg.content}
                actions={msg.actions}
                timestamp={msg.timestamp || new Date()}
                onNavigate={(page) => { navigate(page); handleClose(); }}
              />
              {/* Action summary after assistant messages with executed actions */}
              {msg.role === "assistant" && msg.actionSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      ml: 0.5,
                      mt: 0.5,
                      px: 1.5,
                      py: 0.6,
                      borderRadius: "10px",
                      background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
                      border: `1px solid ${darkMode ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}`,
                      width: "fit-content",
                    }}
                  >
                    <Icon sx={{ fontSize: "0.85rem", color: "#22c55e" }}>done_all</Icon>
                    <Typography
                      sx={{
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        color: "#22c55e",
                      }}
                    >
                      {msg.actionSummary}
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </Box>
          ))}
        </AnimatePresence>
        {loading && <TypingIndicator />}
      </Box>
    );
  };

  // Render welcome message when conversation is empty
  const renderWelcome = () => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Box
        sx={{
          px: 3,
          pt: 4,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(108,92,231,0.3)",
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: "1.6rem" }}>auto_awesome</Icon>
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: darkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)",
              mb: 0.5,
            }}
          >
            Hi! I&apos;m {assistantName}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: "text.secondary",
              lineHeight: 1.5,
              maxWidth: 300,
              mx: "auto",
            }}
          >
            Your family assistant. I can plan meals, manage chores, update your calendar, and more.
            Try asking me something!
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );

  // Render suggestions as a horizontal scrollable row
  const renderSuggestions = () => {
    return (
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          alignItems: "flex-start",
        }}
      >
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", fontWeight: 500 }}>
          Quick suggestions
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            width: "100%",
            pb: 1,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            "& > *": { scrollSnapAlign: "start", flexShrink: 0 },
          }}
        >
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

  // Render input bar with voice input and send buttons
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
      {/* Voice input button — only shown if Web Speech API is available */}
      {voiceSupported && (
        <Tooltip title={listening ? "Listening..." : "Voice input"} placement="top">
          <IconButton
            onClick={listening ? stopListening : startListening}
            disabled={loading}
            sx={{
              position: "relative",
              color: listening ? "#fff" : darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
              background: listening
                ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
                : darkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              "&:hover": {
                background: listening
                  ? "linear-gradient(135deg, #5B4CD6, #9189ED)"
                  : darkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.08)",
              },
              "&.Mui-disabled": {
                background: "rgba(0,0,0,0.04)",
                color: "rgba(0,0,0,0.15)",
              },
              touchAction: "manipulation",
            }}
          >
            {/* Pulse ring animation when listening */}
            {listening && (
              <Box
                component={motion.div}
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid #6C5CE7",
                  pointerEvents: "none",
                }}
              />
            )}
            <Icon>{listening ? "hearing" : "mic"}</Icon>
          </IconButton>
        </Tooltip>
      )}
      <IconButton
        onClick={handleSubmit}
        disabled={!input.trim() || loading}
        sx={{
          background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
          color: "#fff",
          "&:hover": { background: "linear-gradient(135deg, #5B4CD6, #9189ED)" },
          "&.Mui-disabled": { background: "rgba(108,92,231,0.3)", color: "rgba(255,255,255,0.3)" },
          touchAction: "manipulation",
        }}
      >
        <Icon>send</Icon>
      </IconButton>
    </Box>
  );

  const hasMessages = activeConversation?.messages?.length > 0;

  return (
    <>
      <SlidePanel
        open={open}
        onClose={handleClose}
        width={420}
        icon="auto_awesome"
        title={assistantName}
        subtitle="Your family assistant"
      >
        {/* Conversation controls — positioned below SlidePanel header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 0.5,
            mt: -1.5,
            mb: 0.5,
          }}
        >
          {hasMessages && (
            <Tooltip title="Clear chat" placement="bottom">
              <IconButton
                size="small"
                onClick={handleClearChat}
                sx={{ color: "text.secondary" }}
              >
                <Icon sx={{ fontSize: "1.1rem" }}>delete_outline</Icon>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Chat history" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => setConversationMenuAnchor(e.currentTarget)}
              sx={{ color: "text.secondary" }}
            >
              <Icon sx={{ fontSize: "1.1rem" }}>history</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="New chat" placement="bottom">
            <IconButton size="small" onClick={handleNewChat} sx={{ color: "text.secondary" }}>
              <Icon sx={{ fontSize: "1.1rem" }}>add</Icon>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Memories */}
        {renderMemories()}

        {/* Welcome + suggestions when empty, or messages when active */}
        {hasMessages ? (
          renderMessages()
        ) : (
          <>
            {renderWelcome()}
            {renderSuggestions()}
            {/* Spacer pushes input to bottom when no messages */}
            <Box sx={{ flex: 1 }} />
          </>
        )}

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
            <MenuItem key={conv.id} onClick={() => handleSelectConversation(conv)} sx={{ py: 1.25 }}>
              <Box sx={{ overflow: "hidden", width: "100%" }}>
                <Typography sx={{
                  fontSize: "0.85rem", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 240,
                }}>
                  {conv.title || "Untitled conversation"}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
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
