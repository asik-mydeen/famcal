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
import { useTimerAlarm } from "context/TimerAlarmContext";
import { sendAIMessage, buildAIContext } from "lib/ai";
import SlidePanel from "components/SlidePanel";
import { getDynamicSuggestions } from "lib/aiSuggestions";
import { VOICE_STATES } from "hooks/useVoiceMode";

// Import sub-components
import MemoryChip from "./MemoryChip";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import SuggestionPill from "./SuggestionPill";

// Action summary labels
const ACTION_SUMMARY_LABELS = {
  create_event: "event", update_event: "event update", remove_event: "event removal",
  create_task: "task", update_task: "task update", complete_task: "task completion", remove_task: "task removal",
  add_meal: "meal", update_meal: "meal update", remove_meal: "meal removal",
  create_list: "list", add_list_items: "item", toggle_list_item: "item toggle", remove_list_item: "item removal",
  add_note: "note", remove_note: "note removal",
  add_countdown: "countdown", remove_countdown: "countdown removal",
  add_reward: "reward", claim_reward: "reward claim",
  set_timer: "timer", cancel_timer: "timer cancellation",
  set_alarm: "alarm", cancel_alarm: "alarm cancellation",
  save_memory: "memory saved",
  create_routine: "routine", complete_routine_step: "routine step",
  mood_checkin: "mood check-in",
  add_allowance: "allowance update", set_allowance_rate: "allowance rate",
  check_achievements: "achievement check",
};

function buildActionSummary(executedTypes) {
  if (!executedTypes || executedTypes.length === 0) return null;
  const counts = {};
  executedTypes.forEach((type) => {
    const label = ACTION_SUMMARY_LABELS[type] || type.replace(/_/g, " ");
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([label, count]) => `${count} ${label}${count > 1 ? "s" : ""}`).join(", ");
}

function AIAssistant({
  familyId, dispatch, state, currentPage, externalOpen, onExternalClose,
  voiceActive, voiceState, voiceTranscript, voiceQuery, onVoiceQueryHandled, onVoiceResponse, onTapToSpeak,
  novaMode, novaState, novaSessionTime, onNovaStart, onNovaStop, onNovaInterrupt,
}) {
  const { darkMode } = useThemeMode();
  const navigate = useNavigate();
  const timerAlarm = useTimerAlarm();
  const timerAlarmRef = useRef(null);
  timerAlarmRef.current = timerAlarm;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const aiPreferences = state?.ai_preferences || { assistant_name: "Amara" };
  const conversations = state?.conversations || [];
  const activeConversation = state?.activeConversation || null;
  const memories = state?.memories || [];
  const lists = state?.lists || [];
  const assistantName = aiPreferences.assistant_name || "Amara";

  const aiContext = useMemo(
    () => (state ? buildAIContext(state, currentPage) : {}),
    [state, currentPage]
  );

  const suggestions = useMemo(() => getDynamicSuggestions(currentPage, state), [currentPage, state]);

  // Support external open trigger
  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      if (!voiceActive) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [externalOpen, voiceActive]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose();
        else handleOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const ensureConversation = useCallback(() => {
    if (!activeConversation && conversations.length > 0) {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: conversations[0] });
    } else if (!activeConversation) {
      const newConv = { id: `conv-${Date.now()}`, messages: [], title: null };
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: newConv });
    }
  }, [activeConversation, conversations, dispatch]);

  const handleOpen = () => {
    setOpen(true);
    ensureConversation();
    if (!voiceActive) setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleSelectConversation = async (conversation) => {
    setConversationMenuAnchor(null);
    try {
      const { fetchMessages } = await import("lib/supabase");
      const messages = await fetchMessages(conversation.id);
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: { ...conversation, messages: messages || [] } });
    } catch (e) {
      console.warn("[ai] Failed to load conversation messages:", e);
      dispatch({ type: "SET_ACTIVE_CONVERSATION", value: { ...conversation, messages: [] } });
    }
  };

  // ── Action execution ──
  const executeActions = useCallback(
    (actions) => {
      if (!actions || actions.length === 0) return [];
      const executed = [];
      for (const action of actions) {
        const d = action.data || {};
        try {
          switch (action.type) {
            case "create_event":
              dispatch({ type: "ADD_EVENT", value: { id: crypto.randomUUID(), family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "update_event":
              dispatch({ type: "UPDATE_EVENT", value: d }); executed.push(action.type); break;
            case "remove_event":
              dispatch({ type: "REMOVE_EVENT", value: { id: d.event_id } }); executed.push(action.type); break;
            case "create_task":
              dispatch({ type: "ADD_TASK", value: { id: `task-${Date.now()}`, family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "update_task":
              dispatch({ type: "UPDATE_TASK", value: d }); executed.push(action.type); break;
            case "complete_task":
              dispatch({ type: "COMPLETE_TASK", value: d }); executed.push(action.type); break;
            case "remove_task":
              dispatch({ type: "REMOVE_TASK", value: { id: d.task_id } }); executed.push(action.type); break;
            case "add_meal":
              dispatch({ type: "ADD_MEAL", value: { id: `meal-${Date.now()}`, family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "update_meal":
              dispatch({ type: "UPDATE_MEAL", value: d }); executed.push(action.type); break;
            case "remove_meal":
              dispatch({ type: "REMOVE_MEAL", value: { id: d.meal_id } }); executed.push(action.type); break;
            case "create_list":
              dispatch({ type: "ADD_LIST", value: { id: `list-${Date.now()}`, family_id: familyId, items: [], ...d } });
              executed.push(action.type); break;
            case "add_list_items": {
              const targetList = lists.find(
                (l) => (d.list_name && l.name.toLowerCase() === d.list_name.toLowerCase()) ||
                       (d.list_id && l.id === d.list_id)
              ) || lists.find((l) => l.name.toLowerCase().includes("grocer"));
              if (targetList) {
                const items = Array.isArray(d.items) ? d.items : [d.items];
                items.forEach((itemText) => {
                  dispatch({ type: "ADD_LIST_ITEM", value: { listId: targetList.id, item: { id: `item-${Date.now()}-${Math.random()}`, text: itemText, checked: false } } });
                });
                executed.push(action.type);
              }
              break;
            }
            case "toggle_list_item":
              dispatch({ type: "TOGGLE_LIST_ITEM", value: { listId: d.list_id, itemId: d.item_id } });
              executed.push(action.type); break;
            case "remove_list_item":
              dispatch({ type: "REMOVE_LIST_ITEM", value: { listId: d.list_id, itemId: d.item_id } });
              executed.push(action.type); break;
            case "add_note":
              dispatch({ type: "ADD_NOTE", value: { id: `note-${Date.now()}`, family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "remove_note":
              dispatch({ type: "REMOVE_NOTE", value: { id: d.note_id } }); executed.push(action.type); break;
            case "add_countdown":
              dispatch({ type: "ADD_COUNTDOWN", value: { id: `countdown-${Date.now()}`, family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "remove_countdown":
              dispatch({ type: "REMOVE_COUNTDOWN", value: { id: d.countdown_id } }); executed.push(action.type); break;
            case "add_reward":
              dispatch({ type: "ADD_REWARD", value: { id: `reward-${Date.now()}`, family_id: familyId, ...d } });
              executed.push(action.type); break;
            case "claim_reward":
              dispatch({ type: "CLAIM_REWARD", value: d }); executed.push(action.type); break;
            case "set_timer":
              timerAlarmRef.current.addTimer(d.label || "Timer", d.minutes || 5, d.icon || "timer");
              executed.push(action.type); break;
            case "cancel_timer":
              timerAlarmRef.current.removeTimer(d.timer_id); executed.push(action.type); break;
            case "set_alarm": {
              try {
                let alarmTime;
                if (d.date && d.time) alarmTime = new Date(`${d.date}T${d.time}:00`);
                else if (d.time) {
                  const t = new Date();
                  const parts = d.time.split(":");
                  t.setHours(parseInt(parts[0], 10), parseInt(parts[1] || "0", 10), 0, 0);
                  if (t < new Date()) t.setDate(t.getDate() + 1);
                  alarmTime = t;
                } else break;
                if (isNaN(alarmTime.getTime())) break;
                timerAlarmRef.current.addAlarm(d.title || "Alarm", alarmTime.toISOString(), d.recurring || null, d.icon || "alarm");
                const alarmEnd = new Date(alarmTime); alarmEnd.setMinutes(alarmEnd.getMinutes() + 15);
                dispatch({ type: "ADD_EVENT", value: { id: crypto.randomUUID(), family_id: familyId, title: `\u23F0 ${d.title || "Alarm"}`, start: alarmTime.toISOString(), end: alarmEnd.toISOString(), allDay: false, className: "warning", source: "alarm" } });
                executed.push(action.type);
              } catch (e) { console.warn("[ai] set_alarm failed:", e); }
              break;
            }
            case "cancel_alarm":
              timerAlarmRef.current.removeAlarm(d.alarm_id); executed.push(action.type); break;
            case "create_routine": {
              const routineId = `routine-${Date.now()}`;
              const routineSteps = (d.steps || []).map((s, idx) => ({
                id: `step-${Date.now()}-${idx}`,
                routine_id: routineId,
                title: s.title, icon: s.icon || "check_circle",
                duration_minutes: s.duration_minutes || 5,
                points_value: s.points_value || 5,
                sort_order: idx, completions: [],
              }));
              dispatch({ type: "ADD_ROUTINE", value: {
                id: routineId, family_id: familyId, name: d.name,
                type: d.type || "morning", member_id: d.member_id,
                icon: d.type === "bedtime" ? "bedtime" : d.type === "afternoon" ? "wb_cloudy" : "wb_sunny",
                sort_order: 0, active: true, steps: routineSteps,
              }});
              executed.push(action.type); break;
            }
            case "complete_routine_step":
              dispatch({ type: "COMPLETE_ROUTINE_STEP", value: { routine_step_id: d.routine_step_id, member_id: d.member_id } });
              executed.push(action.type); break;
            case "mood_checkin":
              dispatch({ type: "ADD_MOOD_CHECKIN", value: {
                id: `mood-${Date.now()}`, family_id: familyId,
                member_id: d.member_id, mood: d.mood, note: d.note || null,
                checkin_date: new Date().toISOString().split("T")[0],
                created_at: new Date().toISOString(),
              }});
              executed.push(action.type); break;
            case "add_allowance": {
              const alMember = state.members?.find((m) => m.id === d.member_id);
              if (alMember) {
                const signedAmt = d.type === "deduction" ? -Math.abs(d.amount) : Math.abs(d.amount);
                dispatch({ type: "ADD_ALLOWANCE_TRANSACTION", value: {
                  id: crypto.randomUUID(), family_id: familyId, member_id: d.member_id,
                  amount: signedAmt, type: d.type || "bonus",
                  description: d.description || (d.type === "deduction" ? "Deduction" : "Bonus"),
                  created_at: new Date().toISOString(),
                }});
                dispatch({ type: "UPDATE_MEMBER", value: {
                  id: d.member_id, allowance_balance: (alMember.allowance_balance || 0) + signedAmt,
                }});
              }
              executed.push(action.type); break;
            }
            case "set_allowance_rate":
              dispatch({ type: "UPDATE_MEMBER", value: { id: d.member_id, allowance_rate: d.rate || 0 } });
              executed.push(action.type); break;
            case "check_achievements":
              // Force re-check by completing a no-op; the engine auto-checks on task complete
              // For manual check, we just log it — the achievement engine runs on COMPLETE_TASK
              executed.push(action.type); break;
            case "save_memory":
              dispatch({ type: "ADD_MEMORY", value: { id: `mem-${Date.now()}`, family_id: familyId, category: d.category || "context", content: d.content, active: true } });
              executed.push(action.type); break;
            case "forget_memory":
              dispatch({ type: "REMOVE_MEMORY", value: { id: d.memory_id } }); executed.push(action.type); break;
            case "info": break;
            default: console.warn(`Unknown action type: ${action.type}`);
          }
        } catch (e) { console.warn("[ai] Action failed:", action.type, e); }
      }
      return executed;
    },
    [dispatch, familyId, lists, state]
  );

  // ── Submit message (works for both text and voice) ──
  const submitMessage = useCallback(async (messageText) => {
    if (!messageText?.trim() || loading) return;

    ensureConversation();
    const userMessage = { role: "user", content: messageText.trim() };
    dispatch({ type: "ADD_MESSAGE", value: { conversationId: activeConversation?.id, message: userMessage } });
    setInput("");
    setLoading(true);

    try {
      const { timers: currentTimers, alarms: currentAlarms } = timerAlarmRef.current;
      const timerContext = {
        activeTimers: currentTimers.filter((t) => t.running || t.remaining > 0).map((t) => ({
          id: t.id, label: t.label,
          remaining_seconds: t.remaining,
          remaining_formatted: `${Math.floor(t.remaining / 60)}:${String(t.remaining % 60).padStart(2, "0")}`,
        })),
        upcomingAlarms: currentAlarms.filter((a) => a.enabled).map((a) => ({
          id: a.id, title: a.title, alarm_time: a.alarm_time, recurring: a.recurring,
        })),
      };

      const response = await sendAIMessage(
        [...(activeConversation?.messages || []), userMessage],
        { ...aiContext, ...timerContext },
        aiPreferences,
        memories
      );

      const executed = executeActions(response.actions || []);
      const summary = buildActionSummary(executed);

      const assistantMessage = {
        role: "assistant",
        content: response.reply,
        actions: response.actions || [],
        executedTypes: executed,
        actionSummary: summary,
      };

      dispatch({ type: "ADD_MESSAGE", value: { conversationId: activeConversation?.id, message: assistantMessage } });

      // If voice mode is active, speak the response
      if (voiceActive && onVoiceResponse) {
        onVoiceResponse(response.reply);
      }

      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    } catch (error) {
      console.error("AI request failed:", error);
      dispatch({
        type: "ADD_MESSAGE",
        value: { conversationId: activeConversation?.id, message: { role: "assistant", content: `Sorry, I encountered an error: ${error.message || "Please try again."}`, actions: [], executedTypes: [] } },
      });
    } finally {
      setLoading(false);
    }
  }, [loading, activeConversation, aiContext, aiPreferences, memories, executeActions, dispatch, ensureConversation, voiceActive, onVoiceResponse]);

  const handleSubmit = () => submitMessage(input);

  // ── Auto-submit voice queries ──
  useEffect(() => {
    if (voiceQuery && !loading) {
      ensureConversation();
      submitMessage(voiceQuery);
      onVoiceQueryHandled?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceQuery]);

  const handleSuggestionClick = (prompt) => {
    setInput(prompt);
    if (!voiceActive) inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleDismissMemory = (memoryId) => {
    dispatch({ type: "UPDATE_MEMORY", value: { id: memoryId, active: false } });
  };

  // ── Render memories ──
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

  // ── Render messages ──
  const renderMessages = () => {
    const messages = activeConversation?.messages || [];
    if (messages.length === 0) return null;
    return (
      <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 3, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
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
              {msg.role === "assistant" && msg.actionSummary && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: 0.5, mt: 0.5, px: 1.5, py: 0.6, borderRadius: "10px", background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)", border: `1px solid ${darkMode ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}`, width: "fit-content" }}>
                    <Icon sx={{ fontSize: "0.85rem", color: "#22c55e" }}>done_all</Icon>
                    <Typography sx={{ fontSize: "0.76rem", fontWeight: 600, color: "#22c55e" }}>{msg.actionSummary}</Typography>
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

  // ── Render welcome ──
  const renderWelcome = () => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: "16px", background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(108,92,231,0.3)" }}>
          <Icon sx={{ color: "#fff", fontSize: "1.6rem" }}>auto_awesome</Icon>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: darkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)", mb: 0.5 }}>
            Hi! I&apos;m {assistantName}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.5, maxWidth: 300, mx: "auto" }}>
            {novaMode
              ? "Real-time voice mode. Tap the mic to start a session!"
              : voiceActive
              ? "I'm listening. Say something or tap the mic below!"
              : "Your family assistant. I can plan meals, manage chores, update your calendar, and more."}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );

  // ── Render suggestions ──
  const renderSuggestions = () => (
    <Box sx={{ px: 3, py: 2, display: "flex", flexDirection: "column", gap: 1.5, alignItems: "flex-start" }}>
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", fontWeight: 500 }}>Quick suggestions</Typography>
      <Box sx={{ display: "flex", gap: 1, overflowX: "auto", width: "100%", pb: 1, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }, "& > *": { scrollSnapAlign: "start", flexShrink: 0 } }}>
        {suggestions.map((sug, idx) => (
          <SuggestionPill key={idx} icon={sug.icon} label={sug.label} onClick={() => handleSuggestionClick(sug.prompt)} />
        ))}
      </Box>
    </Box>
  );

  // ── Voice input area (replaces text input when voice mode active) ──
  const renderVoiceInput = () => {
    const isRecording = voiceState === VOICE_STATES.RECORDING;
    const isActivated = voiceState === VOICE_STATES.ACTIVATED;
    const isProcessing = voiceState === VOICE_STATES.PROCESSING || loading;
    const isSpeaking = voiceState === VOICE_STATES.SPEAKING;

    let statusText = "Tap mic or say something";
    let statusIcon = "mic";
    if (isRecording) { statusText = "Recording..."; statusIcon = "mic"; }
    else if (isProcessing) { statusText = voiceTranscript || "Thinking..."; statusIcon = "hourglass_top"; }
    else if (isSpeaking) { statusText = "Speaking..."; statusIcon = "volume_up"; }
    else if (isActivated) { statusText = "Listening..."; statusIcon = "hearing"; }

    return (
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
        {/* Voice status text */}
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: "text.secondary", textAlign: "center" }}>
          {statusText}
        </Typography>

        {/* Mic button with pulse animation */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            onClick={onTapToSpeak}
            sx={{
              position: "relative",
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              touchAction: "manipulation",
              background: (isRecording || isActivated)
                ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
                : isSpeaking
                ? "linear-gradient(135deg, #22c55e, #4ade80)"
                : isProcessing
                ? darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
                : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              transition: "all 0.3s ease",
              "&:hover": { transform: "scale(1.05)" },
              "&:active": { transform: "scale(0.95)" },
            }}
          >
            {/* Pulse ring when recording/activated */}
            {(isRecording || isActivated) && (
              <Box
                component={motion.div}
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                sx={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #6C5CE7", pointerEvents: "none" }}
              />
            )}
            <Icon sx={{
              fontSize: "1.5rem !important",
              color: (isRecording || isActivated) ? "#fff" : isSpeaking ? "#fff" : darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
            }}>
              {statusIcon}
            </Icon>
          </Box>
        </Box>

        {/* Switch to keyboard */}
        <Typography
          onClick={() => { if (inputRef.current) inputRef.current.focus(); }}
          sx={{ fontSize: "0.72rem", color: "text.secondary", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          or type instead
        </Typography>
      </Box>
    );
  };

  // ── Nova real-time voice input area ──
  const renderNovaVoiceInput = () => {
    const isConnected = novaState === "connected" || novaState === "listening" || novaState === "speaking";
    const isListening = novaState === "listening";
    const isSpeaking = novaState === "speaking";
    const isConnecting = novaState === "connecting";
    const isIdle = novaState === "idle";

    let statusText = "Tap to start voice session";
    let statusIcon = "mic";
    if (isConnecting) { statusText = "Connecting to Nova..."; statusIcon = "hourglass_top"; }
    else if (isListening) { statusText = voiceTranscript || "Listening..."; statusIcon = "hearing"; }
    else if (isSpeaking) { statusText = voiceTranscript || "Speaking..."; statusIcon = "volume_up"; }
    else if (isConnected) { statusText = "Connected — speak anytime"; statusIcon = "mic"; }

    return (
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
        {/* Nova session badge */}
        {isConnected && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.4, borderRadius: "10px", background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)", border: `1px solid ${darkMode ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}` }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", animation: "pulse 2s infinite" }} />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#22c55e" }}>
              Nova Real-time Voice
            </Typography>
            {novaSessionTime && (
              <Typography sx={{ fontSize: "0.65rem", color: darkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }}>
                {novaSessionTime}
              </Typography>
            )}
          </Box>
        )}

        {/* Voice status text */}
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: "text.secondary", textAlign: "center", maxWidth: 280 }}>
          {statusText}
        </Typography>

        {/* Mic / connection button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Interrupt button (when speaking) */}
          {isSpeaking && (
            <Box
              onClick={onNovaInterrupt}
              sx={{
                width: 40, height: 40, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", touchAction: "manipulation",
                background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                "&:hover": { background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" },
              }}
            >
              <Icon sx={{ fontSize: "1.2rem !important", color: "text.secondary" }}>stop</Icon>
            </Box>
          )}

          {/* Main mic button */}
          <Box
            onClick={() => {
              if (isIdle || novaState === "error") onNovaStart?.();
              else if (isConnected || isListening || isSpeaking) onNovaStop?.();
            }}
            sx={{
              position: "relative",
              width: 56, height: 56, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", touchAction: "manipulation",
              background: (isConnected || isListening)
                ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
                : isSpeaking
                ? "linear-gradient(135deg, #22c55e, #4ade80)"
                : isConnecting
                ? darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
                : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              transition: "all 0.3s ease",
              "&:hover": { transform: "scale(1.05)" },
              "&:active": { transform: "scale(0.95)" },
            }}
          >
            {/* Pulse ring when listening */}
            {isListening && (
              <Box
                component={motion.div}
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                sx={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #6C5CE7", pointerEvents: "none" }}
              />
            )}
            {/* Sound wave rings when speaking */}
            {isSpeaking && (
              <Box
                component={motion.div}
                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                sx={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #22c55e", pointerEvents: "none" }}
              />
            )}
            <Icon sx={{
              fontSize: "1.5rem !important",
              color: (isConnected || isListening || isSpeaking) ? "#fff" : darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
            }}>
              {isIdle || novaState === "error" ? "mic" : isConnecting ? "hourglass_top" : isConnected || isListening ? statusIcon : "stop"}
            </Icon>
          </Box>
        </Box>

        {/* End session / switch to keyboard */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {isConnected && (
            <Typography
              onClick={onNovaStop}
              sx={{ fontSize: "0.72rem", color: "error.main", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            >
              End session
            </Typography>
          )}
          <Typography
            onClick={() => { if (inputRef.current) inputRef.current.focus(); setShowVoiceInput(false); }}
            sx={{ fontSize: "0.72rem", color: "text.secondary", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          >
            or type instead
          </Typography>
        </Box>
      </Box>
    );
  };

  // ── Text input area ──
  const renderTextInput = () => (
    <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", gap: 1, alignItems: "flex-end" }}>
      <TextField
        inputRef={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask me anything..."
        multiline maxRows={4} fullWidth disabled={loading}
        sx={{ "& .MuiInputBase-root": { borderRadius: "12px", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" } }}
      />
      {/* Voice toggle button */}
      {voiceActive && (
        <Tooltip title="Voice mode" placement="top">
          <IconButton
            onClick={onTapToSpeak}
            sx={{
              color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
              background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              touchAction: "manipulation",
            }}
          >
            <Icon>mic</Icon>
          </IconButton>
        </Tooltip>
      )}
      <IconButton
        onClick={handleSubmit}
        disabled={!input.trim() || loading}
        sx={{
          background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", color: "#fff",
          "&:hover": { background: "linear-gradient(135deg, #5B4CD6, #9189ED)" },
          "&.Mui-disabled": { background: "rgba(108,92,231,0.3)", color: "rgba(255,255,255,0.3)" },
          touchAction: "manipulation",
        }}
      >
        <Icon>send</Icon>
      </IconButton>
    </Box>
  );

  // ── Determine which input to show ──
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  // When voice mode opens the sidebar, default to voice input
  useEffect(() => {
    if (novaMode && externalOpen) {
      setShowVoiceInput(true);
    } else if (voiceActive && externalOpen && voiceState !== VOICE_STATES.IDLE) {
      setShowVoiceInput(true);
    }
  }, [voiceActive, novaMode, externalOpen, voiceState]);

  // When voice state transitions to activated/recording/processing, show voice input
  useEffect(() => {
    if (voiceActive && [VOICE_STATES.ACTIVATED, VOICE_STATES.RECORDING, VOICE_STATES.PROCESSING, VOICE_STATES.SPEAKING].includes(voiceState)) {
      setShowVoiceInput(true);
    }
  }, [voiceActive, voiceState]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    }
  }, [activeConversation?.messages?.length]);

  const hasMessages = activeConversation?.messages?.length > 0;

  return (
    <>
      <SlidePanel open={open} onClose={handleClose} width={420} icon="auto_awesome" title={assistantName} subtitle="Your family assistant">
        {/* Conversation controls */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, mt: -1.5, mb: 0.5 }}>
          {hasMessages && (
            <Tooltip title="Clear chat" placement="bottom">
              <IconButton size="small" onClick={handleNewChat} sx={{ color: "text.secondary" }}>
                <Icon sx={{ fontSize: "1.1rem" }}>delete_outline</Icon>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Chat history" placement="bottom">
            <IconButton size="small" onClick={(e) => setConversationMenuAnchor(e.currentTarget)} sx={{ color: "text.secondary" }}>
              <Icon sx={{ fontSize: "1.1rem" }}>history</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="New chat" placement="bottom">
            <IconButton size="small" onClick={handleNewChat} sx={{ color: "text.secondary" }}>
              <Icon sx={{ fontSize: "1.1rem" }}>add</Icon>
            </IconButton>
          </Tooltip>
        </Box>

        {renderMemories()}

        {hasMessages ? renderMessages() : (
          <>
            {renderWelcome()}
            {renderSuggestions()}
            <Box sx={{ flex: 1 }} />
          </>
        )}

        {/* Input: Nova voice, legacy voice, or text mode */}
        {novaMode && showVoiceInput
          ? renderNovaVoiceInput()
          : voiceActive && showVoiceInput
          ? renderVoiceInput()
          : renderTextInput()}
      </SlidePanel>

      {/* Conversation history menu */}
      <Menu
        anchorEl={conversationMenuAnchor}
        open={Boolean(conversationMenuAnchor)}
        onClose={() => setConversationMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 300, width: 280, background: darkMode ? "rgba(10,10,26,0.98)" : "#ffffff", backdropFilter: "blur(20px)" } }}
      >
        {conversations.length === 0 ? (
          <MenuItem disabled><Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No recent chats</Typography></MenuItem>
        ) : (
          conversations.slice(0, 10).map((conv) => (
            <MenuItem key={conv.id} onClick={() => handleSelectConversation(conv)} sx={{ py: 1.25 }}>
              <Box sx={{ overflow: "hidden", width: "100%" }}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                  {conv.title || "Untitled conversation"}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{conv.message_count || 0} messages</Typography>
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
  voiceActive: PropTypes.bool,
  voiceState: PropTypes.string,
  voiceTranscript: PropTypes.string,
  voiceQuery: PropTypes.string,
  onVoiceQueryHandled: PropTypes.func,
  onVoiceResponse: PropTypes.func,
  onTapToSpeak: PropTypes.func,
  novaMode: PropTypes.bool,
  novaState: PropTypes.string,
  novaSessionTime: PropTypes.string,
  onNovaStart: PropTypes.func,
  onNovaStop: PropTypes.func,
  onNovaInterrupt: PropTypes.func,
};

export default AIAssistant;
