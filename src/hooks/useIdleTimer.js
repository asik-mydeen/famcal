import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to detect user inactivity
 * @param {number} timeoutMs - Milliseconds before marking as idle (default: 5 minutes)
 * @returns {{ isIdle: boolean, resetTimer: function }}
 */
export default function useIdleTimer(timeoutMs = 300000) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    // Pause on visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
      } else {
        resetTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    resetTimer(); // Start timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return { isIdle, resetTimer };
}
