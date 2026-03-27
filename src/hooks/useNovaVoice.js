/**
 * useNovaVoice — Amazon Nova 2 Sonic real-time voice via WebSocket proxy.
 *
 * Connects to a proxy server (Railway) that adds auth headers, then relays
 * to Nova's Realtime API. Handles streaming audio I/O, transcription,
 * AI responses, and tool calling for family actions.
 *
 * Flow: Mic → PCM 24kHz → proxy → Nova → audio response → speaker
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { buildAIContext } from "lib/ai";

const NOVA_STATES = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  LISTENING: "listening",
  SPEAKING: "speaking",
  ERROR: "error",
};

const SESSION_MAX_MS = 8 * 60 * 1000; // 8 minutes
const SAMPLE_RATE = 24000;
const CHUNK_SIZE = 2400; // 100ms of audio at 24kHz

// Module-level to avoid CRA closure bugs
let moduleWs = null;
let moduleAudioCtx = null;
let moduleStream = null;
let moduleProcessor = null;
let modulePlaybackTime = 0;
let moduleIsShuttingDown = false;

// Build Nova session instructions from family state
function buildNovaInstructions(familyState, currentPage) {
  const ctx = familyState ? buildAIContext(familyState, currentPage) : {};
  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const memberList = (ctx.members || []).map((m) => {
    let desc = `- ${m.name} (id: ${m.id}, ${m.points || 0}pts`;
    if (m.birth_date) {
      const age = Math.floor((Date.now() - new Date(m.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      desc += `, age ${age}`;
    }
    return desc + ")";
  }).join("\n") || "No members";

  const taskList = (ctx.activeTasks || []).slice(0, 10).map((t) => {
    const who = (ctx.members || []).find((m) => m.id === t.assigned_to)?.name || "unassigned";
    return `- "${t.title}" assigned to ${who} (due: ${t.due_date || "anytime"}, id: ${t.id})`;
  }).join("\n") || "None";

  const eventList = (ctx.events || []).slice(0, 10).map((e) => {
    const who = (ctx.members || []).find((m) => m.id === e.member_id)?.name || "family";
    const time = e.allDay ? "All day" : `${e.start?.split("T")[1]?.slice(0, 5) || "?"}`;
    return `- ${time}: "${e.title}" (${who}, id: ${e.id})`;
  }).join("\n") || "None";

  const mealList = (ctx.meals || []).slice(0, 10).map((m) =>
    `- ${m.date} ${m.meal_type}: "${m.title}"`
  ).join("\n") || "None";

  return `You are Amara, a warm and friendly family assistant on a wall-mounted calendar display.
TODAY: ${today} (${dayName})
CURRENT PAGE: ${currentPage || "calendar"}

FAMILY MEMBERS:
${memberList}

ACTIVE TASKS (chores):
${taskList}

THIS WEEK'S EVENTS:
${eventList}

THIS WEEK'S MEALS:
${mealList}

RULES:
1. Keep responses SHORT (1-2 sentences) — you're speaking aloud.
2. Match member names to IDs (case-insensitive).
3. For dates: "tomorrow" = today+1. Always use YYYY-MM-DD.
4. For times: "2pm" = "14:00". Use HH:mm format.
5. Be warm, concise, family-friendly. Use member names naturally.
6. Execute actions via tools when the family asks you to add/change/remove things.
7. When you learn facts about the family (preferences, allergies, routines), save them using save_memory.`;
}

// Nova tool definitions for family actions
const NOVA_TOOLS = [
  {
    type: "function",
    name: "create_event",
    description: "Create a calendar event",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        member_id: { type: "string", description: "Member UUID to assign to" },
        start: { type: "string", description: "Start datetime ISO format" },
        end: { type: "string", description: "End datetime ISO format" },
        allDay: { type: "boolean", description: "All day event" },
      },
      required: ["title", "start"],
    },
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a chore or task",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        assigned_to: { type: "string", description: "Member UUID" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        points_value: { type: "integer" },
        category: { type: "string", enum: ["chores", "homework", "errands", "health", "cooking", "pets", "other"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "complete_task",
    description: "Mark a task as completed",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        completed_by: { type: "string", description: "Member UUID who completed it" },
      },
      required: ["task_id"],
    },
  },
  {
    type: "function",
    name: "add_meal",
    description: "Plan a meal for a specific date",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        title: { type: "string" },
      },
      required: ["date", "meal_type", "title"],
    },
  },
  {
    type: "function",
    name: "add_list_items",
    description: "Add items to a shopping/grocery list",
    parameters: {
      type: "object",
      properties: {
        list_name: { type: "string", description: "List name, e.g. Groceries" },
        items: { type: "array", items: { type: "string" } },
      },
      required: ["items"],
    },
  },
  {
    type: "function",
    name: "save_memory",
    description: "Remember a fact about the family for future reference",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Fact to remember" },
        category: { type: "string", enum: ["preference", "routine", "rule", "health", "context", "people"] },
      },
      required: ["content"],
    },
  },
];

export default function useNovaVoice(proxyUrl, familyState, dispatch, { currentPage, onTranscript, onError } = {}) {
  const [novaState, setNovaState] = useState(NOVA_STATES.IDLE);
  const [transcript, setTranscript] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionTimeFormatted, setSessionTimeFormatted] = useState("");

  const stateRef = useRef(NOVA_STATES.IDLE);
  stateRef.current = novaState;

  const familyStateRef = useRef(familyState);
  familyStateRef.current = familyState;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isAvailable = Boolean(proxyUrl);
  const isConnected = novaState === NOVA_STATES.CONNECTED || novaState === NOVA_STATES.LISTENING || novaState === NOVA_STATES.SPEAKING;

  // Session timer
  useEffect(() => {
    if (!sessionStartTime) { setSessionTimeFormatted(""); return; }
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, SESSION_MAX_MS - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setSessionTimeFormatted(`${mins}:${String(secs).padStart(2, "0")}`);
      if (remaining <= 0) endSession();
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartTime]);

  // Execute a Nova tool call
  const executeToolCall = useCallback((name, args, callId) => {
    const d = typeof args === "string" ? JSON.parse(args) : args;
    const dp = dispatchRef.current;
    const familyId = familyStateRef.current?.family?.id;
    let result = { success: true };

    try {
      switch (name) {
        case "create_event":
          dp({ type: "ADD_EVENT", value: { id: crypto.randomUUID(), family_id: familyId, ...d } });
          result.message = `Created event "${d.title}"`;
          break;
        case "create_task":
          dp({ type: "ADD_TASK", value: { id: `task-${Date.now()}`, family_id: familyId, ...d } });
          result.message = `Created task "${d.title}"`;
          break;
        case "complete_task":
          dp({ type: "COMPLETE_TASK", value: d });
          result.message = `Completed task`;
          break;
        case "add_meal":
          dp({ type: "ADD_MEAL", value: { id: `meal-${Date.now()}`, family_id: familyId, ...d } });
          result.message = `Added ${d.meal_type} "${d.title}"`;
          break;
        case "add_list_items": {
          const lists = familyStateRef.current?.lists || [];
          const list = lists.find((l) => l.name?.toLowerCase() === (d.list_name || "groceries").toLowerCase())
            || lists.find((l) => l.name?.toLowerCase().includes("grocer"));
          if (list) {
            (d.items || []).forEach((text) => {
              dp({ type: "ADD_LIST_ITEM", value: { listId: list.id, item: { id: `item-${Date.now()}-${Math.random()}`, text, checked: false } } });
            });
            result.message = `Added ${d.items.length} items to ${list.name}`;
          } else {
            result = { success: false, message: "No grocery list found" };
          }
          break;
        }
        case "save_memory":
          dp({ type: "ADD_MEMORY", value: { id: `mem-${Date.now()}`, family_id: familyId, category: d.category || "context", content: d.content, active: true } });
          result.message = `Remembered: ${d.content}`;
          break;
        default:
          result = { success: false, message: `Unknown tool: ${name}` };
      }
    } catch (e) {
      result = { success: false, message: e.message };
    }

    // Send result back to Nova
    if (moduleWs?.readyState === WebSocket.OPEN) {
      moduleWs.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result),
        },
      }));
    }
  }, []);

  // Convert Float32 audio to base64 PCM16
  const float32ToBase64Pcm = useCallback((float32Array) => {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 32768 : s * 32767;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 4096) {
      binary += String.fromCharCode(...bytes.slice(i, i + 4096));
    }
    return btoa(binary);
  }, []);

  // Play PCM audio from Nova
  const playAudioDelta = useCallback((base64Audio) => {
    if (!moduleAudioCtx) return;
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const buffer = moduleAudioCtx.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);

      const source = moduleAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(moduleAudioCtx.destination);

      // Schedule playback to avoid gaps
      const now = moduleAudioCtx.currentTime;
      const start = Math.max(now, modulePlaybackTime);
      source.start(start);
      modulePlaybackTime = start + buffer.duration;
    } catch (e) {
      console.warn("[nova] Audio playback error:", e.message);
    }
  }, []);

  // Start Nova session
  const startSession = useCallback(async () => {
    if (!proxyUrl || moduleWs) return;
    moduleIsShuttingDown = false;

    setNovaState(NOVA_STATES.CONNECTING);

    try {
      // Set up audio context for playback
      moduleAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      modulePlaybackTime = 0;

      // Connect to proxy
      const wsUrl = proxyUrl.startsWith("ws") ? proxyUrl : `wss://${proxyUrl}`;
      const ws = new WebSocket(wsUrl);
      moduleWs = ws;

      ws.onopen = () => {
        console.log("[nova] Connected to proxy");
        // Wait for session.created from Nova before configuring
      };

      ws.onmessage = (evt) => {
        if (moduleIsShuttingDown) return;
        let event;
        try { event = JSON.parse(evt.data); } catch { return; }

        switch (event.type) {
          case "session.created":
            console.log("[nova] Session created — configuring...");
            // Configure session with family context
            ws.send(JSON.stringify({
              type: "session.update",
              session: {
                type: "realtime",
                instructions: buildNovaInstructions(familyStateRef.current, currentPageRef.current),
                audio: {
                  input: { turn_detection: { threshold: 0.5 } },
                  output: { voice: "olivia" },
                },
                tools: NOVA_TOOLS,
                tool_choice: "auto",
                max_output_tokens: 1000,
              },
            }));
            break;

          case "session.updated":
            console.log("[nova] Session configured — starting mic...");
            setNovaState(NOVA_STATES.CONNECTED);
            setSessionStartTime(Date.now());
            // Start streaming mic audio
            startMicStream(ws);
            break;

          case "conversation.item.input_audio_transcription.completed":
            setTranscript(event.transcript || "");
            onTranscriptRef.current?.(event.transcript || "", "user");
            break;

          case "response.output_audio.delta":
            if (stateRef.current !== NOVA_STATES.SPEAKING) setNovaState(NOVA_STATES.SPEAKING);
            playAudioDelta(event.delta);
            break;

          case "response.output_audio_transcript.done":
            onTranscriptRef.current?.(event.transcript || "", "assistant");
            break;

          case "response.done":
            setNovaState(NOVA_STATES.LISTENING);
            setTranscript("");
            break;

          case "error":
            console.error("[nova] Error:", event.error);
            onError?.(event.error?.message || "Nova error");
            break;

          default:
            // Handle tool calls
            if (event.type === "response.function_call_arguments.done") {
              executeToolCall(event.name, event.arguments, event.call_id);
            }
        }
      };

      ws.onerror = (err) => {
        console.error("[nova] WebSocket error:", err);
        setNovaState(NOVA_STATES.ERROR);
      };

      ws.onclose = (evt) => {
        console.log("[nova] Disconnected:", evt.code, evt.reason);
        cleanup();
        if (!moduleIsShuttingDown) setNovaState(NOVA_STATES.IDLE);
      };
    } catch (err) {
      console.error("[nova] Failed to start:", err);
      setNovaState(NOVA_STATES.ERROR);
    }
  }, [proxyUrl, playAudioDelta, executeToolCall]);

  // Start microphone streaming
  const startMicStream = useCallback(async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      moduleStream = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(CHUNK_SIZE, 1, 1);

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || moduleIsShuttingDown) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64Pcm(float32);
        ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }));
      };

      moduleProcessor = processor;
      setNovaState(NOVA_STATES.LISTENING);
      console.log("[nova] Mic streaming started");
    } catch (err) {
      console.error("[nova] Mic access failed:", err);
      setNovaState(NOVA_STATES.ERROR);
    }
  }, [float32ToBase64Pcm]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (moduleProcessor) { moduleProcessor.disconnect(); moduleProcessor = null; }
    if (moduleStream) { moduleStream.getTracks().forEach((t) => t.stop()); moduleStream = null; }
    if (moduleAudioCtx) { try { moduleAudioCtx.close(); } catch {} moduleAudioCtx = null; }
    modulePlaybackTime = 0;
  }, []);

  // End session
  const endSession = useCallback(() => {
    moduleIsShuttingDown = true;
    if (moduleWs?.readyState === WebSocket.OPEN) {
      try { moduleWs.close(); } catch {}
    }
    moduleWs = null;
    cleanup();
    setNovaState(NOVA_STATES.IDLE);
    setSessionStartTime(null);
    setTranscript("");
  }, [cleanup]);

  // Interrupt AI while speaking
  const interrupt = useCallback(() => {
    if (moduleWs?.readyState === WebSocket.OPEN) {
      moduleWs.send(JSON.stringify({ type: "conversation.item.truncate", content_index: 0, audio_end_ms: 0 }));
    }
    setNovaState(NOVA_STATES.LISTENING);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      moduleIsShuttingDown = true;
      if (moduleWs?.readyState === WebSocket.OPEN) try { moduleWs.close(); } catch {}
      moduleWs = null;
      cleanup();
    };
  }, [cleanup]);

  return {
    novaState,
    transcript,
    isAvailable,
    isConnected,
    sessionTimeFormatted,
    startSession,
    endSession,
    interrupt,
    // Compatibility with legacy voice interface
    voiceState: novaState,
    isEnabled: isConnected,
    isSupported: true,
    enable: startSession,
    disable: endSession,
    tapToSpeak: startSession,
    speakResponse: () => {}, // Nova handles TTS natively
    endVoiceSession: endSession,
  };
}
