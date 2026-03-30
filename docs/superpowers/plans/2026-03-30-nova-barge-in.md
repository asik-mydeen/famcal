# Nova Voice Barge-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User speaking (or tapping) during Amara's playback stops audio immediately and puts Nova into LISTENING state — true barge-in like Alexa/ChatGPT voice.

**Architecture:** Three changes: (1) track AudioBufferSource nodes so they can be cancelled, (2) detect user voice during SPEAKING via energy check in the existing ScriptProcessor, (3) add a tap-to-interrupt pill in VoiceOverlay. All three converge on a single `bargeIn()` function. Nova's `input_audio_buffer.speech_started` server event is a secondary trigger.

**Tech Stack:** React (plain JS), Web Audio API (AudioContext, AudioBufferSource, ScriptProcessorNode), WebSocket, MUI

**Files:**
- Modify: `src/hooks/useNovaVoice.js` — all barge-in logic
- Modify: `src/components/VoiceOverlay/index.js` — interrupt pill during SPEAKING
- Modify: `src/App.js` — pass `onInterrupt` prop to VoiceOverlay

---

### Task 1: Add module-level vars and constants to useNovaVoice.js

**Files:**
- Modify: `src/hooks/useNovaVoice.js`

- [ ] **Step 1: Add new constants after existing constants (after line 24)**

Open `src/hooks/useNovaVoice.js`. After this block:
```js
const CHUNK_SIZE = 4096; // ~170ms at 24kHz (must be power of 2 for ScriptProcessorNode)
```

Add:
```js
const BARGE_IN_DB_THRESHOLD = -35; // dB — speech vs ambient noise during playback
const BARGE_IN_DEBOUNCE_MS = 150;  // ms sustained speech before barge-in triggers
```

- [ ] **Step 2: Add new module-level vars after existing module vars (after line 35)**

After this block:
```js
let moduleMicBufferQueue = []; // buffer mic audio before session is ready
let moduleSessionReady = false;
```

Add:
```js
let moduleActiveSources = [];     // AudioBufferSource nodes currently scheduled
let moduleCurrentItemId = null;   // item_id of active response (for truncate)
let moduleResponseStartTime = 0;  // AudioContext.currentTime when response started
let moduleBargeInStartMs = 0;     // wall-clock ms when above-threshold energy began
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): add barge-in module vars and constants"
```

---

### Task 2: Track AudioBufferSource nodes in playAudioDelta

**Files:**
- Modify: `src/hooks/useNovaVoice.js` — `playAudioDelta` function (~line 317)

- [ ] **Step 1: Replace the source.start + modulePlaybackTime lines in playAudioDelta**

Find this block inside `playAudioDelta`:
```js
      const source = modulePlaybackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(modulePlaybackCtx.destination);

      // Schedule playback sequentially to avoid gaps
      const now = modulePlaybackCtx.currentTime;
      const start = Math.max(now + 0.005, modulePlaybackTime);
      source.start(start);
      modulePlaybackTime = start + buffer.duration;
```

Replace with:
```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): track AudioBufferSource nodes for cancellation"
```

---

### Task 3: Capture item_id and response start time from audio delta event

**Files:**
- Modify: `src/hooks/useNovaVoice.js` — `response.output_audio.delta` case (~line 434)

- [ ] **Step 1: Update the response.output_audio.delta handler**

Find this case in `ws.onmessage`:
```js
          case "response.output_audio.delta":
            if (stateRef.current !== NOVA_STATES.SPEAKING) {
              setNovaState(NOVA_STATES.SPEAKING);
              // Reset playback time on new response to avoid scheduling far in the future
              modulePlaybackTime = modulePlaybackCtx?.currentTime || 0;
            }
            playAudioDelta(event.delta);
            break;
```

Replace with:
```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): capture item_id and response start time for barge-in"
```

---

### Task 4: Add bargeIn() function

**Files:**
- Modify: `src/hooks/useNovaVoice.js` — add after the existing `interrupt` callback (~line 546)

- [ ] **Step 1: Replace the existing interrupt callback with bargeIn + alias**

Find the existing `interrupt` callback:
```js
  // Interrupt AI while speaking
  const interrupt = useCallback(() => {
    if (moduleWs?.readyState === WebSocket.OPEN) {
      moduleWs.send(JSON.stringify({ type: "conversation.item.truncate", content_index: 0, audio_end_ms: 0 }));
    }
    setNovaState(NOVA_STATES.LISTENING);
  }, []);
```

Replace with:
```js
  // Barge-in: stop local audio + signal Nova to cancel response
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): add bargeIn() — stops audio + signals Nova truncate/cancel"
```

---

### Task 5: Add client-side energy detection in onaudioprocess

**Files:**
- Modify: `src/hooks/useNovaVoice.js` — `startMicStream` / `onaudioprocess` callback (~line 497)

- [ ] **Step 1: Add energy detection inside the onaudioprocess callback**

Find this block inside `startMicStream`:
```js
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || moduleIsShuttingDown) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64Pcm(float32);

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
```

Replace with:
```js
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || moduleIsShuttingDown) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64Pcm(float32);

        // Barge-in detection: check mic energy during SPEAKING
        // stateRef is a module-level ref — safe to read here without closure issues
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
              // bargeIn is defined in hook scope; call via moduleBargeInFn to avoid closure
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
```

- [ ] **Step 2: Add moduleBargeInFn module-level pointer (same pattern as other module fn pointers)**

After the existing module-level vars block, add:
```js
let moduleBargeInFn = null; // updated each render to avoid stale closure in onaudioprocess
```

Then inside the hook body (after `bargeIn` is defined, before the return statement), add:
```js
  // Update module-level pointer so onaudioprocess can call bargeIn without closure issues
  moduleBargeInFn = bargeIn;
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): detect user speech during playback for auto barge-in"
```

---

### Task 6: Add Nova server-side speech_started handler + cleanup

**Files:**
- Modify: `src/hooks/useNovaVoice.js`

- [ ] **Step 1: Handle input_audio_buffer.speech_started in ws.onmessage**

In the `ws.onmessage` switch statement, add a new case. Find the `default:` case:
```js
          default:
            // Handle tool calls
            if (event.type === "response.function_call_arguments.done") {
              executeToolCall(event.name, event.arguments, event.call_id);
            }
```

Replace with:
```js
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
```

- [ ] **Step 2: Clear moduleActiveSources in cleanup()**

Find the `cleanup` callback:
```js
  const cleanup = useCallback(() => {
    moduleSessionReady = false;
    moduleMicBufferQueue = [];
    if (moduleProcessor) { moduleProcessor.disconnect(); moduleProcessor = null; }
    if (moduleStream) { moduleStream.getTracks().forEach((t) => t.stop()); moduleStream = null; }
    if (moduleMicCtx) { try { moduleMicCtx.close(); } catch {} moduleMicCtx = null; }
    if (modulePlaybackCtx) { try { modulePlaybackCtx.close(); } catch {} modulePlaybackCtx = null; }
    modulePlaybackTime = 0;
  }, []);
```

Replace with:
```js
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
```

- [ ] **Step 3: Export bargeIn in the return value**

Find the return object at the bottom of the hook. Add `bargeIn` to it:
```js
  return {
    novaState,
    transcript,
    isAvailable,
    isConnected,
    sessionTimeFormatted,
    startSession,
    endSession,
    interrupt,
    bargeIn,           // ← add this
    // Compatibility with legacy voice interface
    voiceState: novaState,
    isEnabled: isConnected,
    isSupported: true,
    enable: startSession,
    disable: endSession,
    tapToSpeak: startSession,
    speakResponse: () => {},
    endVoiceSession: endSession,
  };
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNovaVoice.js
git commit -m "feat(nova): server speech_started triggers barge-in + cleanup barge-in state"
```

---

### Task 7: Update VoiceOverlay — interrupt pill during SPEAKING

**Files:**
- Modify: `src/components/VoiceOverlay/index.js`

- [ ] **Step 1: Accept onInterrupt prop and render interrupt pill during SPEAKING**

Replace the entire file content with:

```js
/**
 * VoiceOverlay — Minimal listening indicator for voice mode.
 * All voice interaction UI lives in AIAssistant sidebar.
 * Shows "Ask Amara" pill when listening, "Tap to interrupt" pill when speaking.
 */
/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";
import { VOICE_STATES } from "hooks/useVoiceMode";

function VoiceOverlay({ voiceState, isEnabled, onDisable, onTapToSpeak, onInterrupt }) {
  const { tokens, darkMode } = useAppTheme();

  if (!isEnabled) return null;

  const accent = tokens.accent.main;

  // Interrupt pill — shown while Nova/Amara is speaking
  const isSpeaking = voiceState === "speaking" || voiceState === VOICE_STATES.SPEAKING;
  if (isSpeaking) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 100, md: 28 },
          left: { xs: 16, md: 96 },
          zIndex: 1150,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2,
          py: 0.75,
          borderRadius: "20px",
          background: darkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: `0 2px 12px ${alpha(accent, 0.25)}`,
          cursor: "pointer",
          pointerEvents: "auto",
          touchAction: "manipulation",
          "&:hover": { boxShadow: `0 4px 20px ${alpha(accent, 0.4)}` },
          "&:active": { transform: "scale(0.95)" },
        }}
        onClick={onInterrupt}
      >
        <Box
          sx={{
            width: 8, height: 8, borderRadius: "50%",
            bgcolor: accent,
            animation: "speaking-dot 1s ease-in-out infinite",
            "@keyframes speaking-dot": {
              "0%, 100%": { transform: "scale(1)", opacity: 0.7 },
              "50%": { transform: "scale(1.4)", opacity: 1 },
            },
          }}
        />
        <Icon sx={{ fontSize: "1rem !important", color: accent }}>mic</Icon>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>
          Tap to interrupt
        </Typography>
      </Box>
    );
  }

  // Hide during processing/recording/connecting (sidebar handles those)
  const hiddenStates = [VOICE_STATES.RECORDING, VOICE_STATES.PROCESSING, "connecting"];
  if (hiddenStates.includes(voiceState)) return null;

  // Default: "Ask Amara" listening pill
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 100, md: 28 },
        left: { xs: 16, md: 96 },
        zIndex: 1150,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 2,
        py: 0.75,
        borderRadius: "20px",
        background: darkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
        pointerEvents: "auto",
        touchAction: "manipulation",
        "&:hover": { boxShadow: `0 4px 20px ${alpha(accent, 0.3)}` },
        "&:active": { transform: "scale(0.95)" },
      }}
      onClick={onTapToSpeak}
      onContextMenu={(e) => { e.preventDefault(); onDisable?.(); }}
    >
      <Box
        sx={{
          width: 8, height: 8, borderRadius: "50%",
          bgcolor: tokens.priority.low,
          animation: "listening-dot 2s ease-in-out infinite",
          "@keyframes listening-dot": {
            "0%, 100%": { opacity: 0.4 },
            "50%": { opacity: 1 },
          },
        }}
      />
      <Icon sx={{ fontSize: "1rem !important", color: accent }}>mic</Icon>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>
        Ask Amara
      </Typography>
    </Box>
  );
}

export default memo(VoiceOverlay);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VoiceOverlay/index.js
git commit -m "feat(voice): show tap-to-interrupt pill during SPEAKING state"
```

---

### Task 8: Wire onInterrupt prop in App.js

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: Pass onInterrupt to VoiceOverlay**

Find the VoiceOverlay usage (~line 934):
```jsx
            <VoiceOverlay
              voiceState={voice.voiceState}
              isEnabled={voiceModeEnabled}
              onDisable={voice.disable}
              onTapToSpeak={() => {
                setAiOpen(true);
                if (useNova && !nova.isConnected) nova.startSession();
                else voice.tapToSpeak();
              }}
            />
```

Replace with:
```jsx
            <VoiceOverlay
              voiceState={voice.voiceState}
              isEnabled={voiceModeEnabled}
              onDisable={voice.disable}
              onTapToSpeak={() => {
                setAiOpen(true);
                if (useNova && !nova.isConnected) nova.startSession();
                else voice.tapToSpeak();
              }}
              onInterrupt={useNova ? nova.bargeIn : undefined}
            />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.js
git commit -m "feat(voice): wire onInterrupt prop to nova.bargeIn in App"
```

---

### Task 9: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm start
```

Expected: compiles without errors

- [ ] **Step 2: Verify barge-in flow**

1. Open app, enable voice mode in Settings
2. Connect Nova session (click Ask Amara)
3. Ask a question that produces a long response (e.g. "Tell me everything on the calendar this week")
4. While Amara is responding, start talking
5. Expected: audio stops within ~150-170ms, VoiceOverlay switches from "Tap to interrupt" back to "Ask Amara", Nova processes new speech

- [ ] **Step 3: Verify tap-to-interrupt**

1. While Amara is speaking, click "Tap to interrupt" pill
2. Expected: audio stops immediately, state returns to LISTENING

- [ ] **Step 4: Verify natural end still works**

1. Ask a short question, let Amara respond fully without interrupting
2. Expected: response plays to completion, state returns to LISTENING, no console errors

- [ ] **Step 5: Check console for errors during barge-in**

Expected: no errors. Acceptable warnings: `[nova]` audio warnings from stopped nodes (browser may warn about stopping already-finished nodes — safe to ignore)
