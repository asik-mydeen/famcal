/**
 * useVoiceMode — "Hey Amara" voice-activated AI assistant.
 *
 * Two modes:
 * 1. NATIVE: Web Speech API (Chrome/Edge/Safari) — always listening, wake word
 * 2. WHISPER: MediaRecorder + OpenAI Whisper API (Firefox/any browser) — tap to speak
 *
 * State machine: idle → listening → activated → processing → speaking → listening
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { buildAIContext, voiceSendMessage } from "lib/ai";
import { apiUrl } from "lib/api";

const WAKE_WORDS = ["amara", "amira", "amora", "hey amara", "ok amara"];
const MAX_LISTEN_TIME = 15000;

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const hasNativeSpeech = !!SpeechRecognition;
  // Whisper fallback: works on ANY browser with mic support
  const hasWhisperFallback = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const isSupported = hasNativeSpeech || hasWhisperFallback;
  const mode = hasNativeSpeech ? "native" : "whisper";

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
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

      if (response.actions && response.actions.length > 0 && dispatch) {
        for (const action of response.actions) {
          try { dispatch(action); } catch (e) { console.warn("[voice] Action failed:", e); }
        }
      }

      await speak(response.text || "Done.");
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
      setTranscript("");
    } catch (err) {
      console.error("[voice] AI call failed:", err);
      setAiResponse("Sorry, I couldn't process that.");
      setVoiceState(VOICE_STATES.SPEAKING);
      await speak("Sorry, I couldn't process that.");
      setVoiceState(VOICE_STATES.LISTENING);
      setAiResponse("");
    }
  }, [familyState, dispatch, speak]);

  // ──────────────────────────────────────────────────
  // WHISPER FALLBACK: MediaRecorder + OpenAI Whisper API
  // ──────────────────────────────────────────────────

  const transcribeAudio = useCallback(async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");

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
      console.error("[voice-whisper] Transcription failed:", err);
      return "";
    }
  }, []);

  // Tap-to-speak: start recording
  const startWhisperRecording = useCallback(async () => {
    if (voiceState === VOICE_STATES.ACTIVATED || voiceState === VOICE_STATES.PROCESSING) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (audioBlob.size < 1000) {
          setVoiceState(VOICE_STATES.LISTENING);
          return;
        }

        setVoiceState(VOICE_STATES.PROCESSING);
        setTranscript("Transcribing...");

        const text = await transcribeAudio(audioBlob);
        if (text) {
          // Check if it contains wake word + query, or just query
          const lower = text.toLowerCase();
          let query = text;
          for (const w of WAKE_WORDS) {
            const idx = lower.indexOf(w);
            if (idx !== -1) {
              query = text.slice(idx + w.length).trim() || text;
              break;
            }
          }
          await sendToAI(query);
        } else {
          setTranscript("Couldn't hear that. Try again.");
          setTimeout(() => {
            setTranscript("");
            setVoiceState(VOICE_STATES.LISTENING);
          }, 2000);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      playBeep();
      setVoiceState(VOICE_STATES.ACTIVATED);
      setTranscript("Listening...");
      console.log("[voice-whisper] Recording started");

      // Auto-stop after max listen time
      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_LISTEN_TIME);
    } catch (err) {
      console.error("[voice-whisper] Mic access failed:", err);
      setVoiceState(VOICE_STATES.ERROR);
    }
  }, [voiceState, transcribeAudio, sendToAI, playBeep]);

  // Stop whisper recording
  const stopWhisperRecording = useCallback(() => {
    clearTimers();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [clearTimers]);

  // ──────────────────────────────────────────────────
  // NATIVE: Web Speech API (Chrome/Edge/Safari)
  // ──────────────────────────────────────────────────

  const handleResult = useCallback((event) => {
    const results = Array.from(event.results);
    const latest = results[results.length - 1];
    if (!latest) return;

    const text = latest[0].transcript.toLowerCase().trim();

    if (isActivatedRef.current) {
      queryBufferRef.current = latest[0].transcript.trim();
      setTranscript(queryBufferRef.current);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (latest.isFinal) {
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
      const hasWakeWord = WAKE_WORDS.some((w) => text.includes(w));
      if (hasWakeWord && latest.isFinal) {
        let query = "";
        for (const w of WAKE_WORDS) {
          const idx = text.indexOf(w);
          if (idx !== -1) {
            query = latest[0].transcript.trim().slice(idx + w.length).trim();
            break;
          }
        }

        if (query.length > 3) {
          sendToAI(query);
        } else {
          isActivatedRef.current = true;
          queryBufferRef.current = "";
          setVoiceState(VOICE_STATES.ACTIVATED);
          setTranscript("");
          playBeep();

          maxTimerRef.current = setTimeout(() => {
            const q = queryBufferRef.current;
            isActivatedRef.current = false;
            clearTimers();
            if (q) { sendToAI(q); } else { setVoiceState(VOICE_STATES.LISTENING); setTranscript(""); }
          }, MAX_LISTEN_TIME);
        }
      }
    }
  }, [sendToAI, clearTimers, playBeep]);

  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    recognition.onresult = handleResult;

    recognition.onend = () => {
      if (isActivatedRef.current || [VOICE_STATES.LISTENING, VOICE_STATES.ACTIVATED].includes(voiceState)) {
        restartTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) { try { recognitionRef.current.start(); } catch {} }
        }, 200);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        console.error("[voice] Microphone permission denied");
        setVoiceState(VOICE_STATES.ERROR);
        return;
      }
      if (event.error !== "aborted") {
        restartTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) { try { recognitionRef.current.start(); } catch {} }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceState(VOICE_STATES.LISTENING);
      console.log("[voice] Native recognition started — say 'Hey Amara'");
    } catch (err) {
      console.error("[voice] Failed to start:", err);
    }
  }, [handleResult, voiceState]);

  // ──────────────────────────────────────────────────
  // LIFECYCLE
  // ──────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    clearTimers();
    isActivatedRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    window.speechSynthesis?.cancel();
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript("");
    setAiResponse("");
  }, [clearTimers]);

  const enable = useCallback(() => {
    setIsEnabled(true);
    localStorage.setItem("famcal_voice_mode", "true");
    if (hasNativeSpeech) {
      startRecognition();
    } else {
      setVoiceState(VOICE_STATES.LISTENING);
      console.log("[voice] Whisper mode enabled — tap mic to speak");
    }
  }, [startRecognition, hasNativeSpeech]);

  const disable = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem("famcal_voice_mode", "false");
    stopAll();
  }, [stopAll]);

  // Tap-to-speak trigger (for Whisper mode, also works as manual trigger in native mode)
  const tapToSpeak = useCallback(() => {
    if (voiceState === VOICE_STATES.ACTIVATED) {
      // Already recording — stop and process
      stopWhisperRecording();
    } else if (mode === "whisper") {
      startWhisperRecording();
    } else {
      // Native mode — manual activation (bypass wake word)
      isActivatedRef.current = true;
      queryBufferRef.current = "";
      setVoiceState(VOICE_STATES.ACTIVATED);
      setTranscript("");
      playBeep();
      maxTimerRef.current = setTimeout(() => {
        const q = queryBufferRef.current;
        isActivatedRef.current = false;
        clearTimers();
        if (q) { sendToAI(q); } else { setVoiceState(VOICE_STATES.LISTENING); setTranscript(""); }
      }, MAX_LISTEN_TIME);
    }
  }, [voiceState, mode, startWhisperRecording, stopWhisperRecording, sendToAI, clearTimers, playBeep]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (isEnabled && voiceState === VOICE_STATES.IDLE) {
      if (hasNativeSpeech) {
        startRecognition();
      } else if (hasWhisperFallback) {
        setVoiceState(VOICE_STATES.LISTENING);
        console.log("[voice] Whisper fallback active — tap mic to speak");
      }
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
    mode, // "native" or "whisper"
    enable,
    disable,
    tapToSpeak, // Manual activation (Whisper mode) or bypass wake word (native)
  };
}
