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
const CHUNK_SIZE = 4096; // ~170ms at 24kHz (must be power of 2 for ScriptProcessorNode)
const BARGE_IN_DB_THRESHOLD = -35; // dB — speech vs ambient noise during playback
const BARGE_IN_DEBOUNCE_MS = 150;  // ms sustained speech before barge-in triggers

// Module-level to avoid CRA closure bugs
let moduleWs = null;
let modulePlaybackCtx = null; // dedicated AudioContext for playback
let moduleMicCtx = null; // dedicated AudioContext for mic input
let moduleStream = null;
let moduleProcessor = null;
let modulePlaybackTime = 0;
let moduleIsShuttingDown = false;
let moduleMicBufferQueue = []; // buffer mic audio before session is ready
let moduleSessionReady = false;
let moduleActiveSources = [];     // AudioBufferSource nodes currently scheduled
let moduleCurrentItemId = null;   // item_id of active response (for truncate)
let moduleResponseStartTime = 0;  // AudioContext.currentTime when response started
let moduleBargeInStartMs = 0;     // wall-clock ms when above-threshold energy began
let moduleBargeInFn = null;       // updated each render to avoid stale closure in onaudioprocess

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
  {
    type: "function",
    name: "update_preferences",
    description: "Update the family's meal and cooking preferences (cuisine type, dietary restrictions, etc.)",
    parameters: {
      type: "object",
      properties: {
        cuisine_preferences: { type: "string", description: "Cuisine types e.g. Indian, Italian" },
        dietary_restrictions: { type: "string", description: "e.g. vegetarian, gluten-free" },
        servings: { type: "integer", description: "Default number of servings" },
        cooking_speed: { type: "string", enum: ["quick", "any"] },
        meal_instructions: { type: "string", description: "Special meal planning instructions" },
      },
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
        case "update_preferences":
          dp({ type: "SET_AI_PREFERENCES", value: { ...familyStateRef.current?.ai_preferences, ...d } });
          result.message = `Updated preferences`;
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

  // Play PCM audio from Nova — uses dedicated playback AudioContext
  const playAudioDelta = useCallback((base64Audio) => {
    try {
      // Ensure playback context exists and is running
      if (!modulePlaybackCtx || modulePlaybackCtx.state === "closed") {
        modulePlaybackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        modulePlaybackTime = 0;
      }
      if (modulePlaybackCtx.state === "suspended") {
        modulePlaybackCtx.resume();
      }

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Ensure byte length is even (Int16 = 2 bytes per sample)
      const trimmedLength = bytes.length - (bytes.length % 2);
      if (trimmedLength < 2) return;
      const int16 = new Int16Array(bytes.buffer, 0, trimmedLength / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      if (float32.length === 0) return;

      const buffer = modulePlaybackCtx.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);

      const source = modulePlaybackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(modulePlaybackCtx.destination);

      // Schedule playback sequentially to avoid gaps
      const now = modulePlaybackCtx.currentTime;
      const start = Math.max(now + 0.005, modulePlaybackTime);
      source.start(start);
      modulePlaybackTime = start + buffer.duration;

      // Track node so bargeIn() can cancel it
      moduleActiveSources.push(source);
      source.onended = () => {
        moduleActiveSources = moduleActiveSources.filter((s) => s !== source);
      };
    } catch (e) {
      console.warn("[nova] Audio playback error:", e.message);
    }
  }, []);

  // Start Nova session
  const startSession = useCallback(async () => {
    if (!proxyUrl || moduleWs) return;
    moduleIsShuttingDown = false;
    moduleSessionReady = false;
    moduleMicBufferQueue = [];

    setNovaState(NOVA_STATES.CONNECTING);

    try {
      // Create playback AudioContext early (on user gesture — critical for autoplay)
      modulePlaybackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      await modulePlaybackCtx.resume(); // force resume on user gesture
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
            console.log("[nova] Session created — starting mic + configuring...");
            // Start mic immediately (before config) so we don't miss first words
            startMicStream(ws);
            // Configure session with family context
            ws.send(JSON.stringify({
              type: "session.update",
              session: {
                type: "realtime",
                instructions: buildNovaInstructions(familyStateRef.current, currentPageRef.current),
                audio: {
                  input: {
                    turn_detection: {
                      threshold: 0.5,
                    },
                  },
                  output: { voice: "olivia" },
                },
                tools: NOVA_TOOLS,
                tool_choice: "auto",
                max_output_tokens: 1000,
              },
            }));
            break;

          case "session.updated":
            console.log("[nova] Session configured — flushing buffered audio...");
            moduleSessionReady = true;
            setNovaState(NOVA_STATES.CONNECTED);
            setSessionStartTime(Date.now());
            // Flush any mic audio buffered during config
            moduleMicBufferQueue.forEach((chunk) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: chunk }));
              }
            });
            moduleMicBufferQueue = [];
            setNovaState(NOVA_STATES.LISTENING);
            break;

          case "conversation.item.input_audio_transcription.completed":
            setTranscript(event.transcript || "");
            onTranscriptRef.current?.(event.transcript || "", "user");
            break;

          case "response.output_audio.delta":
            if (stateRef.current !== NOVA_STATES.SPEAKING) {
              setNovaState(NOVA_STATES.SPEAKING);
              // Reset playback time on new response to avoid scheduling far in the future
              modulePlaybackTime = modulePlaybackCtx?.currentTime || 0;
              // Record response start for accurate audio_end_ms calculation
              moduleResponseStartTime = modulePlaybackCtx?.currentTime || 0;
              // Capture item_id for conversation.item.truncate
              moduleCurrentItemId = event.item_id || null;
            }
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

          case "input_audio_buffer.speech_started":
            // Server detected user speech — barge in if we're currently speaking
            if (stateRef.current === NOVA_STATES.SPEAKING) {
              moduleBargeInFn?.();
            }
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

  // Start microphone streaming — buffers audio until session is ready
  const startMicStream = useCallback(async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      moduleStream = stream;

      moduleMicCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      const source = moduleMicCtx.createMediaStreamSource(stream);
      const processor = moduleMicCtx.createScriptProcessor(CHUNK_SIZE, 1, 1);

      source.connect(processor);
      // Connect to destination to keep processor alive (required in some browsers)
      processor.connect(moduleMicCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || moduleIsShuttingDown) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64Pcm(float32);

        // Barge-in detection: check mic energy during SPEAKING
        // stateRef is a stable React ref — always holds latest state value
        if (stateRef.current === NOVA_STATES.SPEAKING) {
          let rms = 0;
          for (let i = 0; i < float32.length; i++) rms += float32[i] * float32[i];
          rms = Math.sqrt(rms / float32.length);
          const db = 20 * Math.log10(Math.max(rms, 0.00001));

          if (db > BARGE_IN_DB_THRESHOLD) {
            if (!moduleBargeInStartMs) {
              moduleBargeInStartMs = Date.now();
            } else if (Date.now() - moduleBargeInStartMs >= BARGE_IN_DEBOUNCE_MS) {
              // Sustained speech detected — barge in
              moduleBargeInFn?.();
            }
          } else {
            // Reset debounce on silence
            moduleBargeInStartMs = 0;
          }
        } else {
          moduleBargeInStartMs = 0;
        }

        if (moduleSessionReady) {
          // Session ready — send directly
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }));
        } else {
          // Buffer audio until session is configured (prevents losing first words)
          moduleMicBufferQueue.push(base64);
          // Cap buffer at ~3 seconds to prevent memory issues
          if (moduleMicBufferQueue.length > 75) moduleMicBufferQueue.shift();
        }
      };

      moduleProcessor = processor;
      console.log("[nova] Mic streaming started (buffering until session ready)");
    } catch (err) {
      console.error("[nova] Mic access failed:", err);
      setNovaState(NOVA_STATES.ERROR);
    }
  }, [float32ToBase64Pcm]);

  // Cleanup
  const cleanup = useCallback(() => {
    moduleSessionReady = false;
    moduleMicBufferQueue = [];
    moduleActiveSources.forEach((s) => { try { s.stop(); } catch {} });
    moduleActiveSources = [];
    moduleCurrentItemId = null;
    moduleResponseStartTime = 0;
    moduleBargeInStartMs = 0;
    if (moduleProcessor) { moduleProcessor.disconnect(); moduleProcessor = null; }
    if (moduleStream) { moduleStream.getTracks().forEach((t) => t.stop()); moduleStream = null; }
    if (moduleMicCtx) { try { moduleMicCtx.close(); } catch {} moduleMicCtx = null; }
    if (modulePlaybackCtx) { try { modulePlaybackCtx.close(); } catch {} modulePlaybackCtx = null; }
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

  // Barge-in: stop local audio immediately + signal Nova to cancel response
  const bargeIn = useCallback(() => {
    // Guard: only act during SPEAKING (idempotent — safe to call multiple times)
    if (stateRef.current !== NOVA_STATES.SPEAKING) return;

    // 1. Stop all scheduled AudioBufferSource nodes immediately
    moduleActiveSources.forEach((s) => { try { s.stop(); } catch {} });
    moduleActiveSources = [];

    // 2. Calculate how many ms of audio actually played
    const audioEndMs = moduleResponseStartTime
      ? Math.round((modulePlaybackCtx?.currentTime - moduleResponseStartTime) * 1000)
      : 0;

    // 3. Signal Nova to truncate + cancel
    if (moduleWs?.readyState === WebSocket.OPEN) {
      // Only send truncate if we have a valid item_id
      if (moduleCurrentItemId) {
        moduleWs.send(JSON.stringify({
          type: "conversation.item.truncate",
          item_id: moduleCurrentItemId,
          content_index: 0,
          audio_end_ms: Math.max(0, audioEndMs),
        }));
      }
      moduleWs.send(JSON.stringify({ type: "response.cancel" }));
    }

    // 4. Reset playback state
    if (modulePlaybackCtx) {
      modulePlaybackTime = modulePlaybackCtx.currentTime;
    }
    moduleResponseStartTime = 0;
    moduleCurrentItemId = null;
    moduleBargeInStartMs = 0;

    // 5. Return to listening
    setNovaState(NOVA_STATES.LISTENING);
  }, []);

  // Legacy alias — kept for backwards compat
  const interrupt = bargeIn;

  // Update module-level pointer so onaudioprocess can call bargeIn without closure issues
  moduleBargeInFn = bargeIn;

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
    bargeIn,
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
