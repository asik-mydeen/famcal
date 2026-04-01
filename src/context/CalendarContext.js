import { createContext, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { useFamilyController } from "./FamilyContext";

const CalendarContext = createContext(null);
CalendarContext.displayName = "CalendarContext";

function CalendarProvider({ children }) {
  const [state, dispatch] = useFamilyController();

  const value = useMemo(() => {
    const events = state.events || [];
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      events,
      dispatch,
      todayEvents: events.filter((e) => (e.start || "").split("T")[0] === todayStr),
    };
  }, [state.events, dispatch]);

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

CalendarProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

function useCalendarContext() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendarContext must be used within CalendarProvider");
  return ctx;
}

export { CalendarContext, CalendarProvider, useCalendarContext };
