/**
 * useNovaVoice — Amazon Nova 2 Sonic real-time voice hook.
 *
 * Replaces the Whisper+OpenAI TTS pipeline with a single WebSocket
 * speech-to-speech model. Handles:
 * - Streaming PCM audio from mic to Nova
 * - Server-side VAD (better than client-side)
 * - Transcription, AI response, audio output
 * - Tool/function calling for family actions
 *
 * Falls back gracefully when Nova key is unavailable.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { buildAIContext } from "lib/ai";

// ── Nova States ──
export const NOVA_STATES = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  LISTENING: "listening",
  SPEAKING: "speaking",
  ERROR: "error",
};

// ── Constants ──
const NOVA_WS_URL = "wss://api.nova.amazon.com/v1/realtime?model=nova-2-sonic-v1";
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const CHUNK_SIZE = 2400; // ~100ms at 24kHz
const MAX_SESSION_MS = 8 * 60 * 1000; // 8 min session limit
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECTS = 3;

// ── Module-level state (avoids CRA closure bugs with refs) ──
let moduleWs = null;
let moduleAudioCtx = null;
let moduleStream = null;
let moduleProcessor = null;
let moduleSource = null;
let modulePlaybackTime = 0;
let moduleIsShuttingDown = false;
let moduleSessionStartTime = 0;
let moduleReconnectCount = 0;

/**
 * Base64 encode an ArrayBuffer (handles large buffers by chunking).
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Base64 decode to Uint8Array.
 */
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Float32 audio data to Int16 PCM.
 */
function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Convert Int16 PCM to Float32 for AudioContext playback.
 */
function int16ToFloat32(int16) {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/**
 * Build Nova session instructions from family state — mirrors api/chat.js system prompt.
 */
function buildNovaInstructions(familyState, currentPage) {
  const ctx = buildAIContext(familyState, currentPage);
  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const memberList = ctx.members?.map((m) => {
    let desc = `- ${m.name} (id: ${m.id}, ${m.points || 0}pts, level ${m.level || 1}`;
    if (m.birth_date) {
      const age = Math.floor((Date.now() - new Date(m.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      desc += `, age ${age}`;
    }
    if (m.streak_days) desc += `, ${m.streak_days}d streak`;
    desc += ")";
    return desc;
  }).join("\n") || "No members";

  const activeTasksStr = ctx.activeTasks?.map((t) => {
    const who = ctx.members?.find((m) => m.id === t.assigned_to)?.name || "unassigned";
    const pri = t.priority ? ` [${t.priority}]` : "";
    return `- "${t.title}" assigned to ${who} (due: ${t.due_date || "anytime"}${pri}, id: ${t.id})`;
  }).join("\n") || "None";

  const weekEvents = ctx.events?.map((e) => {
    const time = e.allDay ? "All day" : `${e.start?.split("T")[1]?.slice(0, 5) || "?"}-${e.end?.split("T")[1]?.slice(0, 5) || "?"}`;
    const who = ctx.members?.find((m) => m.id === e.member_id)?.name || "family";
    return `- ${time}: "${e.title}" (${who})`;
  }).join("\n") || "None";

  const weekMeals = ctx.meals?.map(
    (m) => `- ${m.date} ${m.meal_type}: "${m.title}"`
  ).join("\n") || "None";

  const familyName = ctx.familyName || "the family";
  const assistantName = familyState?.ai_preferences?.assistant_name || "Amara";

  const prefs = familyState?.ai_preferences || {};
  let prefsBlock = "";
  const prefLines = [];
  if (prefs.cuisine_preferences) prefLines.push(`Cuisine: ${Array.isArray(prefs.cuisine_preferences) ? prefs.cuisine_preferences.join(", ") : prefs.cuisine_preferences}`);
  if (prefs.dietary_restrictions) prefLines.push(`Dietary restrictions: ${Array.isArray(prefs.dietary_restrictions) ? prefs.dietary_restrictions.join(", ") : prefs.dietary_restrictions}`);
  if (prefs.personality) prefLines.push(`Personality: ${prefs.personality}`);
  if (prefs.tone) prefLines.push(`Tone: ${prefs.tone}`);
  if (prefLines.length > 0) {
    prefsBlock = `\n\nFAMILY PREFERENCES (use automatically — never ask):\n${prefLines.join("\n")}`;
  }

  let memoriesBlock = "";
  const memories = familyState?.memories?.filter((m) => m.active) || [];
  if (memories.length > 0) {
    memoriesBlock = `\n\nYOU REMEMBER:\n${memories.slice(0, 30).map((m) => `- ${m.content}`).join("\n")}`;
  }

  return `You are ${assistantName}, the ${familyName}'s personal assistant on their wall-mounted family calendar. You are speaking aloud via voice — keep responses SHORT (1-2 sentences).

TODAY: ${today} (${dayName})

FAMILY MEMBERS:
${memberList}

ACTIVE TASKS:
${activeTasksStr}

THIS WEEK'S EVENTS:
${weekEvents}

THIS WEEK'S MEALS:
${weekMeals}${prefsBlock}${memoriesBlock}

RULES:
1. Match member names to IDs (case-insensitive).
2. For dates: "tomorrow" = today+1, "next Monday" = actual date. Always use YYYY-MM-DD.
3. For times: "2pm" = "14:00". Use 24h format HH:mm.
4. Be warm, concise, family-friendly. Address members by name.
5. Keep responses SHORT since you are speaking aloud. 1-2 sentences max.
6. Execute actions via tools when the user asks to create, update, or complete something.
7. When asked a question that needs no action, just answer conversationally.
8. NEVER describe actions without executing them via tools.`;
}

/**
 * Build Nova tool definitions for family actions.
 */
function buildNovaTools() {
  return [
    {
      type: "function",
      name: "create_event",
      description: "Create a calendar event",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          member_id: { type: "string", description: "Member ID to assign to" },
          start: { type: "string", description: "ISO datetime for start, e.g. 2026-03-28T14:00:00" },
          end: { type: "string", description: "ISO datetime for end" },
          allDay: { type: "boolean", description: "Whether this is an all-day event" },
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
          title: { type: "string", description: "Task title" },
          assigned_to: { type: "string", description: "Member ID to assign to" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
          points_value: { type: "integer", description: "Points for completing this task" },
          category: {
            type: "string",
            enum: ["chores", "homework", "errands", "health", "cooking", "pets", "other"],
            description: "Task category",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority level",
          },
        },
        required: ["title"],
      },
    },
    {
      type: "function",
      name: "complete_task",
      description: "Mark a task as complete",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID of the task to complete" },
          completed_by: { type: "string", description: "Member ID who completed it" },
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
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Type of meal",
          },
          title: { type: "string", description: "Meal name/title" },
        },
        required: ["date", "meal_type", "title"],
      },
    },
    {
      type: "function",
      name: "add_list_items",
      description: "Add items to a shopping or grocery list",
      parameters: {
        type: "object",
        properties: {
          list_name: { type: "string", description: "Name of the list, e.g. Groceries" },
          items: {
            type: "array",
            items: { type: "string" },
            description: "Array of item names to add",
          },
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
          content: { type: "string", description: "The fact to remember" },
          category: {
            type: "string",
            enum: ["preference", "routine", "rule", "health", "context"],
            description: "Category of the memory",
          },
        },
        required: ["content"],
      },
    },
  ];
}

/**
 * useNovaVoice — main hook for Nova 2 Sonic real-time voice.
 *
 * @param {string|null} apiKey — Nova API key (null = disabled)
 * @param {Object} familyState — full family state from FamilyContext
 * @param {Function} dispatch — FamilyContext dispatch
 * @param {Object} options
 * @param {string} options.currentPage — current page for context
 * @param {Function} options.onTranscript — called with (text, role) for chat display
 * @param {Function} options.onError — called with error message
 */
export default function useNovaVoice(apiKey, familyState, dispatch, options = {}) {
  const { currentPage = "calendar", onTranscript, onError } = options;

  const [novaState, setNovaState] = useState(NOVA_STATES.IDLE);
  const [transcript, setTranscript] = useState("");
  const [sessionTimeLeft, setSessionTimeLeft] = useState(MAX_SESSION_MS);

  const familyStateRef = useRef(familyState);
  familyStateRef.current = familyState;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const sessionTimerRef = useRef(null);
  const pendingToolCallsRef = useRef(new Map());

  const isSupported = typeof WebSocket !== "undefined" && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // ── Session timer ──
  const startSessionTimer = useCallback(() => {
    moduleSessionStartTime = Date.now();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - moduleSessionStartTime;
      const remaining = Math.max(0, MAX_SESSION_MS - elapsed);
      setSessionTimeLeft(remaining);
      if (remaining <= 0) {
        // Session expired — disconnect gracefully
        disconnect();
      }
    }, 1000);
  }, []);

  // ── Tool call execution ──
  const executeToolCall = useCallback((name, args, callId) => {
    const d = args || {};
    const familyId = familyStateRef.current?.family?.id;
    const lists = familyStateRef.current?.lists || [];
    let result = { success: true };

    try {
      switch (name) {
        case "create_event":
          dispatchRef.current({
            type: "ADD_EVENT",
            value: { id: crypto.randomUUID(), family_id: familyId, ...d },
          });
          result = { success: true, message: `Created event "${d.title}"` };
          break;
        case "create_task":
          dispatchRef.current({
            type: "ADD_TASK",
            value: { id: `task-${Date.now()}`, family_id: familyId, ...d },
          });
          result = { success: true, message: `Created task "${d.title}"` };
          break;
        case "complete_task":
          dispatchRef.current({ type: "COMPLETE_TASK", value: d });
          result = { success: true, message: "Task completed" };
          break;
        case "add_meal":
          dispatchRef.current({
            type: "ADD_MEAL",
            value: { id: `meal-${Date.now()}`, family_id: familyId, ...d },
          });
          result = { success: true, message: `Added ${d.meal_type} "${d.title}" for ${d.date}` };
          break;
        case "add_list_items": {
          const targetList = lists.find(
            (l) => (d.list_name && l.name.toLowerCase() === d.list_name.toLowerCase()) ||
              (d.list_id && l.id === d.list_id)
          ) || lists.find((l) => l.name.toLowerCase().includes("grocer"));
          if (targetList) {
            const items = Array.isArray(d.items) ? d.items : [d.items];
            items.forEach((itemText) => {
              dispatchRef.current({
                type: "ADD_LIST_ITEM",
                value: {
                  listId: targetList.id,
                  item: { id: `item-${Date.now()}-${Math.random()}`, text: itemText, checked: false },
                },
              });
            });
            result = { success: true, message: `Added ${items.length} items to ${targetList.name}` };
          } else {
            result = { success: false, message: "No matching list found" };
          }
          break;
        }
        case "save_memory":
          dispatchRef.current({
            type: "ADD_MEMORY",
            value: {
              id: `mem-${Date.now()}`,
              family_id: familyId,
              category: d.category || "context",
              content: d.content,
              active: true,
            },
          });
          result = { success: true, message: "Memory saved" };
          break;
        default:
          result = { success: false, message: `Unknown tool: ${name}` };
      }
    } catch (err) {
      console.error("[nova] Tool execution error:", name, err);
      result = { success: false, message: err.message };
    }

    // Notify transcript
    onTranscriptRef.current?.(`[Action: ${name}] ${result.message}`, "system");

    return result;
  }, []);

  // ── Send tool result back to Nova ──
  const sendToolResult = useCallback((callId, result) => {
    if (!moduleWs || moduleWs.readyState !== WebSocket.OPEN) return;
    moduleWs.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result),
      },
    }));
    // Request Nova to continue generating after tool result
    moduleWs.send(JSON.stringify({ type: "response.create" }));
  }, []);

  // ── Audio playback (queued to avoid gaps) ──
  const playAudioChunk = useCallback((float32Data) => {
    if (!moduleAudioCtx || moduleIsShuttingDown) return;

    try {
      const buffer = moduleAudioCtx.createBuffer(CHANNELS, float32Data.length, SAMPLE_RATE);
      buffer.copyToChannel(float32Data, 0);
      const source = moduleAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(moduleAudioCtx.destination);

      // Schedule playback to avoid gaps/clicks
      const now = moduleAudioCtx.currentTime;
      const startTime = Math.max(now, modulePlaybackTime);
      source.start(startTime);
      modulePlaybackTime = startTime + buffer.duration;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[nova] Audio playback error:", err.message);
      }
    }
  }, []);

  // ── Handle server events ──
  const handleServerEvent = useCallback((event) => {
    if (moduleIsShuttingDown) return;

    switch (event.type) {
      case "session.created":
        if (process.env.NODE_ENV === "development") {
          console.log("[nova] Session created:", event.session?.id);
        }
        setNovaState(NOVA_STATES.CONNECTED);
        break;

      case "session.updated":
        if (process.env.NODE_ENV === "development") {
          console.log("[nova] Session updated");
        }
        break;

      case "input_audio_buffer.speech_started":
        setNovaState(NOVA_STATES.LISTENING);
        setTranscript("Listening...");
        break;

      case "input_audio_buffer.speech_stopped":
        // Server-side VAD detected silence — processing will follow
        break;

      case "conversation.item.input_audio_transcription.completed":
        // User's transcribed words
        if (event.transcript) {
          setTranscript(event.transcript);
          onTranscriptRef.current?.(event.transcript, "user");
        }
        break;

      case "response.output_audio.delta":
        // Streaming audio back from Nova
        if (event.delta) {
          setNovaState(NOVA_STATES.SPEAKING);
          try {
            const pcmBytes = base64ToUint8Array(event.delta);
            const int16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
            const float32 = int16ToFloat32(int16);
            playAudioChunk(float32);
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[nova] Audio decode error:", err.message);
            }
          }
        }
        break;

      case "response.output_audio_transcript.delta":
        // Partial transcript of AI response
        if (event.delta) {
          setTranscript((prev) => prev + event.delta);
        }
        break;

      case "response.output_audio_transcript.done":
        // Full AI response text
        if (event.transcript) {
          setTranscript(event.transcript);
          onTranscriptRef.current?.(event.transcript, "assistant");
        }
        break;

      case "response.output_item.added":
        // Check for function_call items
        if (event.item?.type === "function_call") {
          pendingToolCallsRef.current.set(event.item.call_id, {
            name: event.item.name,
            arguments: "",
          });
        }
        break;

      case "response.function_call_arguments.delta":
        // Accumulate function call arguments
        if (event.call_id && pendingToolCallsRef.current.has(event.call_id)) {
          const call = pendingToolCallsRef.current.get(event.call_id);
          call.arguments += event.delta || "";
        }
        break;

      case "response.function_call_arguments.done":
        // Execute the tool call
        if (event.call_id && pendingToolCallsRef.current.has(event.call_id)) {
          const call = pendingToolCallsRef.current.get(event.call_id);
          pendingToolCallsRef.current.delete(event.call_id);
          try {
            const args = JSON.parse(call.arguments || "{}");
            const result = executeToolCall(call.name, args, event.call_id);
            sendToolResult(event.call_id, result);
          } catch (err) {
            console.error("[nova] Tool arg parse error:", err);
            sendToolResult(event.call_id, { success: false, message: "Invalid arguments" });
          }
        }
        break;

      case "response.done":
        // Response complete — return to connected/listening
        setNovaState(NOVA_STATES.CONNECTED);
        setTranscript("");
        break;

      case "error":
        console.error("[nova] Server error:", event.error);
        onErrorRef.current?.(event.error?.message || "Nova server error");
        if (event.error?.code === "session_expired") {
          disconnect();
        }
        break;

      default:
        if (process.env.NODE_ENV === "development" && !event.type.startsWith("rate_limits")) {
          console.log("[nova] Event:", event.type);
        }
    }
  }, [playAudioChunk, executeToolCall, sendToolResult]);

  // ── Start microphone and send audio to Nova ──
  const startMicStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      moduleStream = stream;

      // Create AudioContext at 24kHz for proper PCM conversion
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      moduleAudioCtx = audioCtx;
      modulePlaybackTime = audioCtx.currentTime;

      const source = audioCtx.createMediaStreamSource(stream);
      moduleSource = source;

      // Use ScriptProcessorNode for PCM conversion (deprecated but widely supported)
      const processor = audioCtx.createScriptProcessor(CHUNK_SIZE, CHANNELS, CHANNELS);
      moduleProcessor = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (moduleIsShuttingDown || !moduleWs || moduleWs.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        const base64 = arrayBufferToBase64(int16.buffer);

        moduleWs.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64,
        }));
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[nova] Mic stream started at", audioCtx.sampleRate, "Hz");
      }
    } catch (err) {
      console.error("[nova] Mic access failed:", err);
      setNovaState(NOVA_STATES.ERROR);
      onErrorRef.current?.("Microphone access denied");
    }
  }, []);

  // ── Send session.update with instructions and tools ──
  const sendSessionConfig = useCallback(() => {
    if (!moduleWs || moduleWs.readyState !== WebSocket.OPEN) return;

    const instructions = buildNovaInstructions(familyStateRef.current, currentPageRef.current);
    const tools = buildNovaTools();

    moduleWs.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions,
        voice: "tiffany",
        tools,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "nova-2-sonic-v1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    }));

    if (process.env.NODE_ENV === "development") {
      console.log("[nova] Session config sent");
    }
  }, []);

  // ── Connect to Nova WebSocket ──
  const connect = useCallback(async () => {
    if (!apiKey || !isSupported || moduleIsShuttingDown) return;

    setNovaState(NOVA_STATES.CONNECTING);
    moduleReconnectCount = 0;

    try {
      const ws = new WebSocket(NOVA_WS_URL, []);

      // Set auth header via protocol (WebSocket API limitation — use URL param or first message)
      // Nova uses Bearer token in the WebSocket connection
      // Some implementations pass via subprotocol or URL, but we'll send auth on open
      ws.onopen = () => {
        if (process.env.NODE_ENV === "development") {
          console.log("[nova] WebSocket connected");
        }
        moduleWs = ws;

        // Send auth as first message if needed by Nova's protocol
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            model: "nova-2-sonic-v1",
          },
        }));

        // Send full session config
        sendSessionConfig();

        // Start mic stream
        startMicStream();

        // Start session timer
        startSessionTimer();
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleServerEvent(event);
        } catch (err) {
          console.error("[nova] Message parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("[nova] WebSocket error:", err);
        setNovaState(NOVA_STATES.ERROR);
      };

      ws.onclose = (e) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[nova] WebSocket closed:", e.code, e.reason);
        }
        moduleWs = null;

        if (!moduleIsShuttingDown && moduleReconnectCount < MAX_RECONNECTS) {
          moduleReconnectCount++;
          console.log(`[nova] Reconnecting (${moduleReconnectCount}/${MAX_RECONNECTS})...`);
          setTimeout(() => {
            if (!moduleIsShuttingDown) connect();
          }, RECONNECT_DELAY_MS);
        } else {
          setNovaState(NOVA_STATES.IDLE);
        }
      };
    } catch (err) {
      console.error("[nova] Connection failed:", err);
      setNovaState(NOVA_STATES.ERROR);
      onErrorRef.current?.("Failed to connect to Nova");
    }
  }, [apiKey, isSupported, sendSessionConfig, startMicStream, handleServerEvent, startSessionTimer]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    moduleIsShuttingDown = true;

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    if (moduleProcessor) {
      moduleProcessor.onaudioprocess = null;
      try { moduleProcessor.disconnect(); } catch {}
      moduleProcessor = null;
    }

    if (moduleSource) {
      try { moduleSource.disconnect(); } catch {}
      moduleSource = null;
    }

    if (moduleStream) {
      moduleStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      moduleStream = null;
    }

    if (moduleWs) {
      try { moduleWs.close(1000, "User disconnected"); } catch {}
      moduleWs = null;
    }

    if (moduleAudioCtx) {
      try { moduleAudioCtx.close(); } catch {}
      moduleAudioCtx = null;
    }

    modulePlaybackTime = 0;
    moduleSessionStartTime = 0;
    moduleReconnectCount = 0;
    pendingToolCallsRef.current.clear();

    setNovaState(NOVA_STATES.IDLE);
    setTranscript("");
    setSessionTimeLeft(MAX_SESSION_MS);
  }, []);

  // ── Update session instructions when family state changes ──
  const updateInstructions = useCallback(() => {
    if (moduleWs && moduleWs.readyState === WebSocket.OPEN && novaState !== NOVA_STATES.IDLE) {
      sendSessionConfig();
    }
  }, [novaState, sendSessionConfig]);

  // ── Public: start Nova voice session ──
  const startSession = useCallback(() => {
    moduleIsShuttingDown = false;
    connect();
  }, [connect]);

  // ── Public: end Nova voice session ──
  const endSession = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // ── Public: interrupt current speech (barge-in) ──
  const interrupt = useCallback(() => {
    if (moduleWs && moduleWs.readyState === WebSocket.OPEN) {
      moduleWs.send(JSON.stringify({ type: "response.cancel" }));
      // Reset playback queue
      modulePlaybackTime = moduleAudioCtx?.currentTime || 0;
      setNovaState(NOVA_STATES.CONNECTED);
      setTranscript("");
    }
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      moduleIsShuttingDown = true;
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (moduleProcessor) {
        moduleProcessor.onaudioprocess = null;
        try { moduleProcessor.disconnect(); } catch {}
        moduleProcessor = null;
      }
      if (moduleSource) {
        try { moduleSource.disconnect(); } catch {}
        moduleSource = null;
      }
      if (moduleStream) {
        moduleStream.getTracks().forEach((t) => t.stop());
        moduleStream = null;
      }
      if (moduleWs) {
        try { moduleWs.close(); } catch {}
        moduleWs = null;
      }
      if (moduleAudioCtx) {
        try { moduleAudioCtx.close(); } catch {}
        moduleAudioCtx = null;
      }
    };
  }, []);

  // Format session time remaining
  const sessionTimeFormatted = useMemo(() => {
    const mins = Math.floor(sessionTimeLeft / 60000);
    const secs = Math.floor((sessionTimeLeft % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, [sessionTimeLeft]);

  return {
    novaState,
    transcript,
    isSupported,
    isAvailable: Boolean(apiKey) && isSupported,
    isConnected: novaState !== NOVA_STATES.IDLE && novaState !== NOVA_STATES.ERROR,
    sessionTimeLeft,
    sessionTimeFormatted,
    startSession,
    endSession,
    interrupt,
    updateInstructions,
    // Compatibility with legacy voice interface
    voiceState: novaState,
    isEnabled: novaState !== NOVA_STATES.IDLE,
  };
}
