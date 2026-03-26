/**
 * useVoiceMode — "Hey Amara" voice-activated AI assistant.
 *
 * State machine: idle → listening → activated → processing → speaking → listening
 *
 * Uses Web Speech API (SpeechRecognition + SpeechSynthesis) — no external APIs.
 * Wake word: "amara" (also matches "hey amara", "ok amara", fuzzy: "amira", "amora")
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { buildAIContext, voiceSendMessage } from "lib/ai";

const WAKE_WORDS = ["amara", "amira", "amora", "hey amara", "ok amara"];
const SILENCE_TIMEOUT = 4000; // 4s silence after activation → send query
const MAX_LISTEN_TIME = 15000; // 15s max listening after wake word

const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const VOICE_STATES = {
  IDLE: "idle",
  LISTENING: "listening",
  ACTIVATED: "activated",
  PROCESSING: "processing",
  SPEAKING: "speaking",
  ERROR: "error",
};

export default function useVoiceMode(familyState, dispatch) {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem("famcal_voice_mode") === "true");

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const queryBufferRef = useRef("");
  const restartTimerRef = useRef(null);
  const isActivatedRef = useRef(false);

  const isSupported = !!SpeechRecognition;

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
  }, []);

  // Text-to-speech
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return Promise.resolve();
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Prefer a female English voice for "Amara" persona
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

  // Send query to AI
  const sendToAI = useCallback(async (query) => {
    if (!query.trim() || !familyState) return;

    setVoiceState(VOICE_STATES.PROCESSING);
    setTranscript(query);

    try {
      const context = buildAIContext(familyState, window.location.pathname.split("/").pop() || "calendar");
      const response = await voiceSendMessage(query, context, familyState.ai_preferences);

      setAiResponse(response.text || "");
      setVoiceState(VOICE_STATES.SPEAKING);

      // Execute any AI actions
      if (response.actions && response.actions.length > 0 && dispatch) {
        for (const action of response.actions) {
          try {
            dispatch(action);
          } catch (e) {
            console.warn("[voice] Action execution failed:", e);
          }
        }
      }

      // Speak the response
      await speak(response.text || "Done.");

      // Return to listening
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
      setTranscript("");
    } catch (err) {
      console.error("[voice] AI call failed:", err);
      setAiResponse("Sorry, I couldn't process that. Try again.");
      setVoiceState(VOICE_STATES.SPEAKING);
      await speak("Sorry, I couldn't process that. Try again.");
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
    }
  }, [familyState, dispatch, speak]);

  // Handle wake word detection + query capture
  const handleResult = useCallback((event) => {
    const results = Array.from(event.results);
    const latest = results[results.length - 1];
    if (!latest) return;

    const text = latest[0].transcript.toLowerCase().trim();

    if (isActivatedRef.current) {
      // Already activated — capture query
      queryBufferRef.current = latest[0].transcript.trim();
      setTranscript(queryBufferRef.current);

      // Reset silence timer on each word
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (latest.isFinal) {
        // Final result — send after short pause (user might continue)
        silenceTimerRef.current = setTimeout(() => {
          const query = queryBufferRef.current;
          if (query) {
            isActivatedRef.current = false;
            clearTimers();
            sendToAI(query);
          }
        }, 2000);
      }
    } else {
      // Check for wake word
      const hasWakeWord = WAKE_WORDS.some((w) => text.includes(w));
      if (hasWakeWord && latest.isFinal) {
        // Extract query after wake word (if any)
        let query = "";
        for (const w of WAKE_WORDS) {
          const idx = text.indexOf(w);
          if (idx !== -1) {
            query = latest[0].transcript.trim().slice(idx + w.length).trim();
            break;
          }
        }

        if (query.length > 3) {
          // Wake word + query in same utterance — send directly
          sendToAI(query);
        } else {
          // Wake word only — enter activated state, wait for query
          isActivatedRef.current = true;
          queryBufferRef.current = "";
          setVoiceState(VOICE_STATES.ACTIVATED);
          setTranscript("");

          // Play activation sound
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

          // Max listen timeout
          maxTimerRef.current = setTimeout(() => {
            const query = queryBufferRef.current;
            isActivatedRef.current = false;
            clearTimers();
            if (query) {
              sendToAI(query);
            } else {
              setVoiceState(VOICE_STATES.LISTENING);
              setTranscript("");
            }
          }, MAX_LISTEN_TIME);
        }
      }
    }
  }, [sendToAI, clearTimers]);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = handleResult;

    recognition.onend = () => {
      // Auto-restart if still in listening/activated mode
      if (voiceState === VOICE_STATES.LISTENING || voiceState === VOICE_STATES.ACTIVATED || isActivatedRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 200);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        console.error("[voice] Microphone permission denied");
        setVoiceState(VOICE_STATES.ERROR);
        return;
      }
      // For other errors, just restart
      if (event.error !== "aborted") {
        restartTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceState(VOICE_STATES.LISTENING);
      console.log("[voice] Recognition started — say 'Hey Amara'");
    } catch (err) {
      console.error("[voice] Failed to start:", err);
    }
  }, [handleResult, voiceState]);

  // Stop recognition
  const stopRecognition = useCallback(() => {
    clearTimers();
    isActivatedRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript("");
    setAiResponse("");
  }, [clearTimers]);

  // Enable/disable voice mode
  const enable = useCallback(() => {
    setIsEnabled(true);
    localStorage.setItem("famcal_voice_mode", "true");
    startRecognition();
  }, [startRecognition]);

  const disable = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem("famcal_voice_mode", "false");
    stopRecognition();
  }, [stopRecognition]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (isEnabled && isSupported && voiceState === VOICE_STATES.IDLE) {
      startRecognition();
    }
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  // Load voices (needed for some browsers)
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
  };
}
