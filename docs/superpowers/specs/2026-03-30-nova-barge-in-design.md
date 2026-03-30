# Nova Voice Barge-In System

> Date: 2026-03-30
> Status: Approved
> Scope: Nova primary voice path only (`useNovaVoice.js` + `VoiceOverlay/index.js`)

## Problem

When Amara is speaking, the user cannot interrupt her. Audio chunks are scheduled into the Web AudioContext queue with `source.start(futureTime)` — once scheduled, they play to completion regardless of any server signal. The existing `interrupt()` function sends `conversation.item.truncate` to Nova but never stops the local audio. The result is Amara keeps talking until finished, which feels broken.

Additionally, `interrupt()` sends the truncate message without `item_id` (required by Nova's API) and uses `audio_end_ms: 0` (inaccurate), so the server-side truncation is also unreliable.

## Goal

True barge-in: user speaks (or taps) during playback → audio stops immediately → Amara listens → responds to the new input. Matches Alexa / ChatGPT voice UX.

## Architecture

Two files change. No new components, no new API routes, no new dependencies.

### Files

| File | Change |
|------|--------|
| `src/hooks/useNovaVoice.js` | Detection logic, audio cancellation, bargeIn(), item tracking |
| `src/components/VoiceOverlay/index.js` | Show interrupt pill during SPEAKING; pass `onInterrupt` prop |

### Detection — Hybrid (client VAD + server event)

**Primary: Client-side energy detection**
The mic `ScriptProcessorNode` is already running at all times (even during SPEAKING). An RMS energy check is added inside the existing `onaudioprocess` callback, gated to `novaState === SPEAKING` only.

- Sample energy is already computed as Float32 per chunk (~170ms at 24kHz/4096)
- RMS → dB conversion (same as existing `useVoiceMode` VAD)
- Threshold: `-35dB` (loud enough to distinguish speech from ambient room noise)
- Debounce: `150ms` sustained above threshold before triggering (prevents hair-trigger on coughs/noise)
- On trigger: call `bargeIn()`

**Secondary: Nova server event**
Listen for `input_audio_buffer.speech_started` in the WebSocket message handler. When received during SPEAKING state, call `bargeIn()`. This handles cases where server detects speech before client debounce completes.

**Manual: Tap-to-interrupt button**
VoiceOverlay shows a "Tap to interrupt" pill during SPEAKING. On tap, calls `bargeIn()`.

All three paths converge on the same `bargeIn()` function.

### bargeIn() — The Core Function

```
1. Guard: if state !== SPEAKING, return (idempotent)
2. Stop all pending AudioBufferSource nodes:
     moduleActiveSources.forEach(s => { try { s.stop() } catch {} })
     moduleActiveSources = []
3. Calculate audio_end_ms:
     Math.round((modulePlaybackCtx.currentTime - moduleResponseStartTime) * 1000)
4. Send to Nova WebSocket:
     { type: "conversation.item.truncate", item_id: moduleCurrentItemId,
       content_index: 0, audio_end_ms }
     { type: "response.cancel" }
5. Reset playback state:
     modulePlaybackTime = modulePlaybackCtx.currentTime
     moduleResponseStartTime = 0
     moduleCurrentItemId = null
6. Reset barge-in debounce:
     moduleBargeInStartMs = 0
7. setNovaState(LISTENING)
```

`bargeIn()` replaces the existing `interrupt()`. The old `interrupt` export becomes a thin alias for backwards compatibility.

### AudioBufferSource Tracking

In `playAudioDelta()`, after `source.start(start)`:
- Push `source` to `moduleActiveSources`
- Set `source.onended = () => { moduleActiveSources = moduleActiveSources.filter(s => s !== source) }`

On `response.output_audio.delta` (first delta of a new response):
- Record `moduleResponseStartTime = modulePlaybackCtx.currentTime` (only on first delta, when state transitions from non-SPEAKING to SPEAKING)
- Record `moduleCurrentItemId = event.item_id`

### New Module-Level Variables

```js
let moduleActiveSources = [];     // scheduled AudioBufferSource nodes
let moduleCurrentItemId = null;   // item_id of current response (for truncate)
let moduleResponseStartTime = 0;  // AudioContext.currentTime when response started
let moduleBargeInStartMs = 0;     // wall-clock ms when above-threshold energy began
```

### New Constants

```js
const BARGE_IN_DB_THRESHOLD = -35;  // dB — distinguishes speech from ambient
const BARGE_IN_DEBOUNCE_MS = 150;   // ms sustained speech before trigger
```

### Data Flow

```
User speaks during SPEAKING
        │
        ├─ ScriptProcessor.onaudioprocess (every ~170ms)
        │    compute RMS → dB
        │    dB > -35 for 150ms? → bargeIn()
        │
        ├─ Nova WebSocket: "input_audio_buffer.speech_started"
        │    during SPEAKING? → bargeIn()
        │
        └─ VoiceOverlay "Tap to interrupt" button
             → bargeIn()

bargeIn()
  ├─ stop all AudioBufferSource nodes
  ├─ ws.send(conversation.item.truncate + response.cancel)
  ├─ reset modulePlaybackTime, moduleCurrentItemId, moduleResponseStartTime
  └─ setNovaState(LISTENING)

Nova receives truncate + cancel
  └─ user's in-flight mic audio processed as new turn
       └─ Nova responds → response.output_audio.delta → SPEAKING
```

### VoiceOverlay Changes

Current behaviour: returns `null` when `voiceState === "speaking"`.

New behaviour: during SPEAKING, render a distinct "Tap to interrupt" pill (same glassmorphism card style, pulsing animation, mic_off icon). Tap calls `onInterrupt` prop. All other states unchanged.

New prop: `onInterrupt: () => void` — passed from wherever `useNovaVoice` is consumed (App.js).

## State Machine

```
CONNECTED/LISTENING → (Nova sends audio.delta) → SPEAKING
SPEAKING → (bargeIn triggered) → LISTENING
SPEAKING → (response.done) → LISTENING   (unchanged — natural end)
```

## What Does NOT Change

- Mic stream lifecycle (start/stop on session connect/disconnect)
- Session management (startSession, endSession)
- Tool calling (executeToolCall)
- Fallback voice system (useVoiceMode) — not in scope
- All other VoiceOverlay states (idle, listening, recording, etc.)
- ScriptProcessorNode chunk size (stays 4096)

## Acceptance Criteria

1. User speaks during SPEAKING → audio stops within ~170ms (one chunk + debounce)
2. User taps "Tap to interrupt" → audio stops immediately
3. After barge-in, Amara listens and responds to the new input
4. Natural end of response (response.done) still works — no regression
5. VoiceOverlay shows interrupt pill during SPEAKING, hides otherwise (same as before)
6. No console errors during normal barge-in flow

## Risks

- **Nova does not support `response.cancel`**: If Nova ignores it, the server will finish generating but the client is already in LISTENING. The user's new speech arrives and Nova starts a new response. Acceptable degradation.
- **`conversation.item.truncate` with wrong item_id**: If `moduleCurrentItemId` is null when bargeIn fires (e.g., barge-in on first delta before item_id is recorded), skip the truncate send. Guard added.
- **False barge-in on ambient noise**: Debounce of 150ms + -35dB threshold should prevent. Users on noisy kiosks may need threshold tuned — kept as a named constant for easy adjustment.
