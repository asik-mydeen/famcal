import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from "react";
import PropTypes from "prop-types";

const TimerAlarmContext = createContext(null);

const initialState = {
  timers: [], // { id, label, icon, duration, remaining, running }
  alarms: [], // from Supabase
  activeAlert: null, // { type: "timer"|"alarm", data: {...} }
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TIMER":
      return { ...state, timers: [...state.timers, action.value] };
    case "REMOVE_TIMER":
      return { ...state, timers: state.timers.filter((t) => t.id !== action.value) };
    case "TICK_TIMERS":
      return {
        ...state,
        timers: state.timers.map((t) =>
          t.running && t.remaining > 0 ? { ...t, remaining: t.remaining - 1 } : t
        ),
      };
    case "PAUSE_TIMER":
      return {
        ...state,
        timers: state.timers.map((t) => (t.id === action.value ? { ...t, running: false } : t)),
      };
    case "RESUME_TIMER":
      return {
        ...state,
        timers: state.timers.map((t) => (t.id === action.value ? { ...t, running: true } : t)),
      };
    case "SET_ALARMS":
      return { ...state, alarms: action.value };
    case "ADD_ALARM":
      return { ...state, alarms: [...state.alarms, action.value] };
    case "REMOVE_ALARM":
      return { ...state, alarms: state.alarms.filter((a) => a.id !== action.value) };
    case "SET_ACTIVE_ALERT":
      return { ...state, activeAlert: action.value };
    case "DISMISS_ALERT":
      return { ...state, activeAlert: null };
    default:
      return state;
  }
}

function TimerAlarmProvider({ children, familyId }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const firedAlarmsRef = useRef(new Set());

  // Load alarms from Supabase
  useEffect(() => {
    if (!familyId) return;
    import("lib/supabase").then(({ fetchAlarms }) => {
      fetchAlarms(familyId).then((alarms) => {
        dispatch({ type: "SET_ALARMS", value: alarms });
      });
    });
  }, [familyId]);

  // Timer tick engine — runs every second
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "TICK_TIMERS" });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for timer completion
  useEffect(() => {
    const completed = state.timers.find((t) => t.running && t.remaining <= 0);
    if (completed) {
      dispatch({ type: "SET_ACTIVE_ALERT", value: { type: "timer", data: completed } });
      dispatch({ type: "REMOVE_TIMER", value: completed.id });
      playAlertSound();
    }
  }, [state.timers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for alarm firing (every 10 seconds)
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      state.alarms.forEach((alarm) => {
        if (firedAlarmsRef.current.has(alarm.id)) return;
        const alarmTime = new Date(alarm.alarm_time);
        const diff = Math.abs(now - alarmTime);
        // Fire if within 30 seconds of alarm time
        if (diff < 30000 && alarm.enabled) {
          firedAlarmsRef.current.add(alarm.id);
          dispatch({ type: "SET_ACTIVE_ALERT", value: { type: "alarm", data: alarm } });
          playAlertSound();
        }
      });
    };

    const interval = setInterval(checkAlarms, 10000); // Check every 10s
    checkAlarms(); // Check immediately
    return () => clearInterval(interval);
  }, [state.alarms]);

  // Web Audio alert sound
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      // Play 3 beeps
      for (let i = 0; i < 3; i++) {
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.4 + 0.2);
      }
      oscillator.start();
      oscillator.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn("[timer] Audio alert failed:", e);
    }
  }, []);

  const addTimer = useCallback((label, minutes, icon = "timer") => {
    const timer = {
      id: `timer-${Date.now()}`,
      label,
      icon,
      duration: minutes * 60,
      remaining: minutes * 60,
      running: true,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_TIMER", value: timer });
    return timer;
  }, []);

  const addAlarm = useCallback(
    async (title, alarmTime, recurring = null, icon = "alarm") => {
      const alarm = {
        family_id: familyId,
        title,
        alarm_time: alarmTime,
        recurring,
        icon,
        enabled: true,
      };
      const { createAlarm } = await import("lib/supabase");
      const saved = await createAlarm(alarm);
      if (saved) {
        dispatch({ type: "ADD_ALARM", value: saved });
      }
      return saved;
    },
    [familyId]
  );

  const removeAlarm = useCallback(async (alarmId) => {
    dispatch({ type: "REMOVE_ALARM", value: alarmId });
    const { deleteAlarm } = await import("lib/supabase");
    deleteAlarm(alarmId);
  }, []);

  const dismissAlert = useCallback(() => {
    dispatch({ type: "DISMISS_ALERT" });
  }, []);

  const extendTimer = useCallback(
    (minutes) => {
      // Re-add the dismissed timer with extra time
      if (state.activeAlert?.type === "timer") {
        const timer = {
          ...state.activeAlert.data,
          id: `timer-${Date.now()}`,
          remaining: minutes * 60,
          running: true,
        };
        dispatch({ type: "ADD_TIMER", value: timer });
        dispatch({ type: "DISMISS_ALERT" });
      }
    },
    [state.activeAlert]
  );

  const value = useMemo(
    () => ({
      timers: state.timers,
      alarms: state.alarms,
      activeAlert: state.activeAlert,
      addTimer,
      addAlarm,
      removeAlarm,
      removeTimer: (id) => dispatch({ type: "REMOVE_TIMER", value: id }),
      pauseTimer: (id) => dispatch({ type: "PAUSE_TIMER", value: id }),
      resumeTimer: (id) => dispatch({ type: "RESUME_TIMER", value: id }),
      dismissAlert,
      extendTimer,
      playAlertSound,
    }),
    [state, addTimer, addAlarm, removeAlarm, dismissAlert, extendTimer, playAlertSound]
  );

  return <TimerAlarmContext.Provider value={value}>{children}</TimerAlarmContext.Provider>;
}

TimerAlarmProvider.propTypes = {
  children: PropTypes.node.isRequired,
  familyId: PropTypes.string,
};

function useTimerAlarm() {
  const ctx = useContext(TimerAlarmContext);
  if (!ctx) throw new Error("useTimerAlarm must be used inside TimerAlarmProvider");
  return ctx;
}

export { TimerAlarmProvider, useTimerAlarm };
