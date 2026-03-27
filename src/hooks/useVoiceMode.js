/**
 * useVoiceMode — "Hey Amara" voice-activated AI assistant.
 *
 * Unified Whisper-based pipeline (replaces dual native/whisper approach):
 * 1. VAD (Voice Activity Detection) via Web Audio API monitors mic levels
 * 2. When speech detected → MediaRecorder captures audio
 * 3. Audio sent to Whisper API with family-context prompt (member names, etc.)
 * 4. Wake word checked in transcription (fuzzy matching)
 * 5. Command extracted and sent to AI
 *
 * State machine: idle → listening → [VAD] → recording → processing → speaking → listening
 *               listening → [VAD] → recording → processing → activated → [VAD] → recording → processing → speaking → listening
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { buildAIContext, voiceSendMessage } from "lib/ai";
import { apiUrl } from "lib/api";

// Wake words + common misheard variations
const WAKE_WORDS = [
  "hey amara", "ok amara", "hi amara",
  "amara", "amira", "amora", "amura", "a mara",
  "hey amira", "hey amora", "hey amura",
  "hey amra", "hey amada", "hey omara",
  "a mirror", "hey a mara", "ok a mara",
];

const MAX_LISTEN_TIME = 15000;
const MIN_RECORDING_MS = 500;
const SILENCE_TIMEOUT_MS = 1500;
const SPEECH_START_MS = 300;
const VAD_INTERVAL_MS = 100;
const VAD_THRESHOLD = -40; // dB — tuned for home/kiosk (less sensitive than -45)
const MAX_WHISPER_PER_MIN = 10;
const POST_SPEAK_COOLDOWN_MS = 800;

export const VOICE_STATES = {
  IDLE: "idle",
  LISTENING: "listening",
  RECORDING: "recording",
  ACTIVATED: "activated",
  PROCESSING: "processing",
  SPEAKING: "speaking",
  ERROR: "error",
};

// Sanitize text for Whisper prompt — prevent prompt injection via member names
function sanitizeForWhisper(text) {
  return (text || "").replace(/[^a-zA-Z0-9\s'-]/g, "").slice(0, 50).trim();
}

// Build Whisper prompt with family vocabulary for transcription accuracy
function buildWhisperPrompt(familyState) {
  const parts = ["Hey Amara.", "OK Amara."];

  const members = familyState?.members || [];
  if (members.length > 0) {
    const names = members.map((m) => sanitizeForWhisper(m.name)).filter(Boolean);
    if (names.length > 0) {
      parts.push(`Family members: ${names.join(", ")}.`);
    }
  }

  const assistantName = sanitizeForWhisper(familyState?.ai_preferences?.assistant_name);
  if (assistantName && assistantName !== "Amara") {
    parts.push(`Hey ${assistantName}.`);
  }

  parts.push("Add chore. Add event. Plan meals. Check off. Assign to. Complete task.");

  return parts.join(" ");
}

// Supported MediaRecorder mime type (WebM → MP4 → OGG fallback)
function getSupportedMimeType() {
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  return types.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) || "";
}

// Module-level state to avoid CRA closure bugs in production
let moduleStream = null;
let moduleAudioCtx = null;
let moduleAnalyser = null;
let moduleVadInterval = null;
let moduleSpeechStartTime = 0;
let moduleIsSpeaking = false;
let moduleCooldownUntil = 0;
let moduleIsShuttingDown = false;

// Module-level function pointers — updated each render to avoid stale closures in VAD interval
let moduleStartRecording = null;
let moduleStopRecording = null;

export default function useVoiceMode(familyState, dispatch) {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem("famcal_voice_mode") === "true");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const isActivatedRef = useRef(false);
  const recordingStartRef = useRef(0);
  const whisperCallsRef = useRef([]);
  const stateRef = useRef(VOICE_STATES.IDLE);

  // Keep stateRef in sync (avoids closure stale state)
  stateRef.current = voiceState;

  const isSupported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }, []);

  // Play activation beep
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  // Text-to-speech
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return Promise.resolve();
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
      ) || voices.find((v) =>
        v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Microsoft"))
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // Rate limit check
  const canCallWhisper = useCallback(() => {
    const now = Date.now();
    whisperCallsRef.current = whisperCallsRef.current.filter((t) => now - t < 60000);
    return whisperCallsRef.current.length < MAX_WHISPER_PER_MIN;
  }, []);

  // Transcribe audio via Whisper API with family context prompt
  const transcribeAudio = useCallback(async (audioBlob) => {
    if (!canCallWhisper()) {
      console.warn("[voice] Rate limit reached — skipping transcription");
      return "__RATE_LIMITED__";
    }
    whisperCallsRef.current.push(Date.now());

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");
      formData.append("prompt", buildWhisperPrompt(familyState));

      const res = await fetch(apiUrl("/api/voice-transcribe"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Transcription failed");
      }

      const { text } = await res.json();
      return text || "";
    } catch (err) {
      console.error("[voice] Transcription failed:", err);
      return "";
    }
  }, [familyState, canCallWhisper]);

  // Send query to AI
  const sendToAI = useCallback(async (query) => {
    if (!query.trim() || !familyState || moduleIsShuttingDown) return;

    setVoiceState(VOICE_STATES.PROCESSING);
    setTranscript(query);

    try {
      const context = buildAIContext(familyState, window.location.pathname.split("/").pop() || "calendar");
      const response = await voiceSendMessage(query, context, familyState.ai_preferences);

      if (moduleIsShuttingDown) return;

      setAiResponse(response.text || "");
      setVoiceState(VOICE_STATES.SPEAKING);

      if (response.actions && response.actions.length > 0 && dispatch) {
        for (const action of response.actions) {
          try { dispatch(action); } catch (e) { console.warn("[voice] Action failed:", e); }
        }
      }

      await speak(response.text || "Done.");

      if (moduleIsShuttingDown) return;
      moduleCooldownUntil = Date.now() + POST_SPEAK_COOLDOWN_MS;
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
      setTranscript("");
    } catch (err) {
      if (moduleIsShuttingDown) return;
      console.error("[voice] AI call failed:", err);
      setAiResponse("Sorry, I couldn't process that.");
      setVoiceState(VOICE_STATES.SPEAKING);
      await speak("Sorry, I couldn't process that.");
      if (moduleIsShuttingDown) return;
      moduleCooldownUntil = Date.now() + POST_SPEAK_COOLDOWN_MS;
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
    }
  }, [familyState, dispatch, speak]);

  // Check for wake word in transcription (fuzzy matching, longest match first)
  const extractWakeWord = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    const sorted = [...WAKE_WORDS].sort((a, b) => b.length - a.length);
    for (const w of sorted) {
      const idx = lower.indexOf(w);
      if (idx !== -1) {
        const afterWake = text.slice(idx + w.length).trim();
        return { found: true, command: afterWake };
      }
    }
    return { found: false, command: "" };
  }, []);

  // Process a completed recording
  const processRecording = useCallback(async (audioBlob) => {
    if (moduleIsShuttingDown) return;

    const duration = Date.now() - recordingStartRef.current;

    if (audioBlob.size < 1000 || duration < MIN_RECORDING_MS) {
      if (isActivatedRef.current) {
        setVoiceState(VOICE_STATES.ACTIVATED);
      } else {
        setVoiceState(VOICE_STATES.LISTENING);
      }
      return;
    }

    setVoiceState(VOICE_STATES.PROCESSING);
    setTranscript("Transcribing...");

    const text = await transcribeAudio(audioBlob);

    if (moduleIsShuttingDown) return;

    // Handle rate limiting
    if (text === "__RATE_LIMITED__") {
      setTranscript("Too many requests. Wait a moment.");
      setTimeout(() => {
        if (!moduleIsShuttingDown) {
          setTranscript("");
          setVoiceState(VOICE_STATES.LISTENING);
        }
      }, 2000);
      return;
    }

    if (!text) {
      if (isActivatedRef.current) {
        setTranscript("Couldn't hear that. Try again.");
        setTimeout(() => {
          if (!moduleIsShuttingDown) {
            setTranscript("");
            setVoiceState(VOICE_STATES.ACTIVATED);
          }
        }, 1500);
      } else {
        setVoiceState(VOICE_STATES.LISTENING);
      }
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[voice] Transcribed:", text);
    }

    if (isActivatedRef.current) {
      isActivatedRef.current = false;
      clearTimers();
      const { command } = extractWakeWord(text);
      await sendToAI(command || text);
    } else {
      const { found, command } = extractWakeWord(text);
      if (found) {
        if (command.length > 3) {
          await sendToAI(command);
        } else {
          isActivatedRef.current = true;
          setVoiceState(VOICE_STATES.ACTIVATED);
          setTranscript("");
          playBeep();
          console.log("[voice] Wake word detected — listening for command");

          maxTimerRef.current = setTimeout(() => {
            if (isActivatedRef.current) {
              isActivatedRef.current = false;
              setVoiceState(VOICE_STATES.LISTENING);
              setTranscript("");
            }
          }, MAX_LISTEN_TIME);
        }
      } else {
        setVoiceState(VOICE_STATES.LISTENING);
      }
    }
  }, [transcribeAudio, sendToAI, extractWakeWord, clearTimers, playBeep]);

  // ──────────────────────────────────────────────────
  // Recording: MediaRecorder on the shared mic stream
  // ──────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!moduleStream || moduleIsShuttingDown) return;
    if (mediaRecorderRef.current?.state === "recording") return;
    const s = stateRef.current;
    if (s === VOICE_STATES.PROCESSING || s === VOICE_STATES.SPEAKING || s === VOICE_STATES.IDLE) return;

    try {
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(moduleStream, options);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        processRecording(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      recordingStartRef.current = Date.now();
      mediaRecorder.start();
      setVoiceState(VOICE_STATES.RECORDING);
      if (isActivatedRef.current) {
        setTranscript("Listening...");
      }
    } catch (err) {
      console.error("[voice] Failed to start recording:", err);
    }
  }, [processRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  }, []);

  // Update module-level function pointers each render (avoids stale closures in VAD)
  moduleStartRecording = startRecording;
  moduleStopRecording = stopRecording;

  // ──────────────────────────────────────────────────
  // VAD: Voice Activity Detection via AnalyserNode
  // ──────────────────────────────────────────────────

  const startVAD = useCallback(() => {
    if (!moduleAnalyser) return;

    const analyser = moduleAnalyser;
    const dataArray = new Float32Array(analyser.fftSize);

    moduleVadInterval = setInterval(() => {
      try {
        const state = stateRef.current;
        if (state === VOICE_STATES.PROCESSING || state === VOICE_STATES.SPEAKING || state === VOICE_STATES.IDLE || state === VOICE_STATES.ERROR) return;
        if (Date.now() < moduleCooldownUntil) return;

        analyser.getFloatTimeDomainData(dataArray);

        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
          rms += dataArray[i] * dataArray[i];
        }
        rms = Math.sqrt(rms / dataArray.length);
        const db = 20 * Math.log10(Math.max(rms, 0.00001));

        const now = Date.now();

        if (db > VAD_THRESHOLD) {
          if (!moduleIsSpeaking) {
            if (!moduleSpeechStartTime) {
              moduleSpeechStartTime = now;
            } else if (now - moduleSpeechStartTime >= SPEECH_START_MS) {
              moduleIsSpeaking = true;
              if (state === VOICE_STATES.LISTENING || state === VOICE_STATES.ACTIVATED) {
                moduleStartRecording?.();
              }
            }
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          moduleSpeechStartTime = 0;
          if (moduleIsSpeaking && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              moduleIsSpeaking = false;
              silenceTimerRef.current = null;
              moduleStopRecording?.();
            }, SILENCE_TIMEOUT_MS);
          }
        }
      } catch (err) {
        console.error("[voice] VAD error:", err);
        // Stop VAD on repeated errors to prevent console spam
        if (moduleVadInterval) {
          clearInterval(moduleVadInterval);
          moduleVadInterval = null;
        }
      }
    }, VAD_INTERVAL_MS);
  }, []); // No deps — uses module-level function pointers

  const stopVAD = useCallback(() => {
    if (moduleVadInterval) {
      clearInterval(moduleVadInterval);
      moduleVadInterval = null;
    }
    moduleIsSpeaking = false;
    moduleSpeechStartTime = 0;
  }, []);

  // ──────────────────────────────────────────────────
  // LIFECYCLE
  // ──────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    moduleIsShuttingDown = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      moduleStream = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      moduleAudioCtx = audioCtx;
      moduleAnalyser = analyser;

      setVoiceState(VOICE_STATES.LISTENING);
      startVAD();
      console.log("[voice] Whisper + VAD listening started — say 'Hey Amara'");
    } catch (err) {
      console.error("[voice] Mic access failed:", err);
      // Cleanup on error — prevent memory leaks
      if (moduleStream) {
        moduleStream.getTracks().forEach((t) => t.stop());
        moduleStream = null;
      }
      if (moduleAudioCtx) {
        try { moduleAudioCtx.close(); } catch {}
        moduleAudioCtx = null;
      }
      moduleAnalyser = null;
      setVoiceState(VOICE_STATES.ERROR);
    }
  }, [startVAD]);

  const stopAll = useCallback(() => {
    moduleIsShuttingDown = true;
    clearTimers();
    stopVAD();
    isActivatedRef.current = false;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null; // prevent processRecording
      try { mediaRecorderRef.current.stop(); } catch {}
    }

    if (moduleStream) {
      moduleStream.getTracks().forEach((t) => t.stop());
      moduleStream = null;
    }

    if (moduleAudioCtx) {
      try { moduleAudioCtx.close(); } catch {}
      moduleAudioCtx = null;
    }
    moduleAnalyser = null;
    moduleIsSpeaking = false;
    moduleSpeechStartTime = 0;
    moduleCooldownUntil = 0;

    window.speechSynthesis?.cancel();
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript("");
    setAiResponse("");
  }, [clearTimers, stopVAD]);

  const enable = useCallback(() => {
    setIsEnabled(true);
    localStorage.setItem("famcal_voice_mode", "true");
    startListening();
  }, [startListening]);

  const disable = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem("famcal_voice_mode", "false");
    stopAll();
  }, [stopAll]);

  // Tap-to-speak: manual activation (bypass wake word, record directly)
  const tapToSpeak = useCallback(() => {
    if (voiceState === VOICE_STATES.RECORDING) {
      stopRecording();
    } else {
      isActivatedRef.current = true;
      playBeep();

      const doActivate = () => {
        setVoiceState(VOICE_STATES.ACTIVATED);
        setTranscript("");
        maxTimerRef.current = setTimeout(() => {
          if (isActivatedRef.current) {
            isActivatedRef.current = false;
            stopRecording();
            setVoiceState(VOICE_STATES.LISTENING);
            setTranscript("");
          }
        }, MAX_LISTEN_TIME);
      };

      if (moduleStream) {
        doActivate();
      } else {
        startListening().then(doActivate);
      }
    }
  }, [voiceState, stopRecording, startListening, playBeep]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (isEnabled && voiceState === VOICE_STATES.IDLE && isSupported) {
      startListening();
    }
    return () => {
      moduleIsShuttingDown = true;
      stopVAD();
      clearTimers();
      if (moduleStream) {
        moduleStream.getTracks().forEach((t) => t.stop());
        moduleStream = null;
      }
      if (moduleAudioCtx) {
        try { moduleAudioCtx.close(); } catch {}
        moduleAudioCtx = null;
      }
      moduleAnalyser = null;
      moduleIsSpeaking = false;
      moduleSpeechStartTime = 0;
      moduleCooldownUntil = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  // Ensure mic is released on page navigation
  useEffect(() => {
    const cleanup = () => {
      if (moduleStream) {
        moduleStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
        moduleStream = null;
      }
    };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);

  // Load TTS voices
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  return {
    voiceState,
    transcript,
    aiResponse,
    isEnabled,
    isSupported,
    enable,
    disable,
    tapToSpeak,
  };
}
