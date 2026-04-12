import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import PageShell from "components/PageShell";
import IconRail from "components/IconRail";
import ExpandablePanel from "components/ExpandablePanel";
import EventPeekCard from "components/EventPeekCard";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import useMediaQuery from "@mui/material/useMediaQuery";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import PropTypes from "prop-types";
import { motion } from "framer-motion";

import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { syncAllMembers, connectMemberCalendar, disconnectMemberCalendar, deleteSyncedEvent, pushEventToGoogle, pushEventUpdateToGoogle, pushEventDeleteToGoogle, hasValidToken } from "lib/googleCalendar";
import { useAppTheme } from "context/ThemeContext";
import { apiUrl } from "lib/api";
import NotesWidget from "components/NotesWidget";
import CountdownWidget from "components/CountdownWidget";
import MessageBoard from "components/MessageBoard";
import MoodBoard from "components/MoodBoard";
import EventComments from "components/EventComments";

// ── Helpers ──

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtTimeLabel(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}
function getMemberGradient(member) {
  if (!member) return "info";
  return MEMBER_COLORS.find((c) => c.value === member.avatar_color)?.gradient || "info";
}

const DAY_START = 6;
const DAY_END = 23;
const HOUR_HEIGHT = 64;
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const RECURRENCE_OPTIONS = [
  { value: "", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Mon-Fri)" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const REMINDER_OPTIONS = [
  { value: "", label: "None" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

function defaultEventForm(dateStr) {
  const today = dateStr || fmtDate(new Date());
  return { title: "", member_id: "", startDate: today, startTime: "09:00", endDate: today, endTime: "10:00", allDay: false, recurrence_rule: "", reminder_minutes: "" };
}

// ── Recurring Event Expansion ──

function expandRecurringEvents(events, viewStart, viewEnd) {
  const result = [];
  const startDate = new Date(viewStart);
  const endDate = new Date(viewEnd);

  events.forEach((evt) => {
    if (!evt.recurrence_rule) {
      result.push({ ...evt, isRecurrence: false });
      return;
    }

    // Original event
    const origStart = new Date(evt.start);
    const origEnd = evt.end ? new Date(evt.end) : new Date(origStart.getTime() + 3600000);
    const duration = origEnd.getTime() - origStart.getTime();
    const rule = evt.recurrence_rule;

    // Add the original event if it falls in range
    if (origStart >= startDate && origStart <= endDate) {
      result.push({ ...evt, isRecurrence: false });
    }

    // Generate virtual copies
    let cursor = new Date(origStart);
    const maxIterations = 400; // Safety limit
    let count = 0;

    const advanceCursor = () => {
      switch (rule) {
        case "daily":
          cursor.setDate(cursor.getDate() + 1);
          break;
        case "weekdays":
          do {
            cursor.setDate(cursor.getDate() + 1);
          } while (cursor.getDay() === 0 || cursor.getDay() === 6);
          break;
        case "weekly":
          cursor.setDate(cursor.getDate() + 7);
          break;
        case "biweekly":
          cursor.setDate(cursor.getDate() + 14);
          break;
        case "monthly":
          cursor.setMonth(cursor.getMonth() + 1);
          break;
        default:
          cursor.setFullYear(cursor.getFullYear() + 100); // Stop
      }
    };

    // Start from the day after the original
    advanceCursor();

    while (cursor <= endDate && count < maxIterations) {
      if (cursor >= startDate) {
        const virtualStart = new Date(cursor);
        const virtualEnd = new Date(cursor.getTime() + duration);
        result.push({
          ...evt,
          id: `${evt.id}_rec_${fmtDate(virtualStart)}`,
          start: evt.allDay ? fmtDate(virtualStart) : virtualStart.toISOString(),
          end: evt.allDay ? fmtDate(virtualEnd) : virtualEnd.toISOString(),
          isRecurrence: true,
          originalEventId: evt.id,
        });
      }
      advanceCursor();
      count++;
    }
  });

  return result;
}

// ── Day Timeline ──

DayTimeline.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  members: PropTypes.array.isRequired,
  events: PropTypes.array.isRequired,
  onEventClick: PropTypes.func.isRequired,
  onTimeClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

function DayTimeline({ date, members, events, onEventClick, onTimeClick, darkMode }) {
  const { tokens, alpha } = useAppTheme();
  const isSmall = useMediaQuery("(max-width:599px)");
  const scrollRef = useRef(null);
  const dateStr = fmtDate(date);
  const now = new Date();
  const isToday = fmtDate(now) === dateStr;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const timeColW = isSmall ? 42 : 54;

  // Scroll to current time on mount
  useEffect(() => {
    if (isToday && scrollRef.current) {
      const scrollTo = Math.max(0, (currentHour - DAY_START - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [isToday, currentHour]);

  // Group events by member
  const memberEvents = useMemo(() => {
    const map = {};
    members.forEach((m) => { map[m.id] = []; });
    map.__family__ = [];
    events.forEach((evt) => {
      const evtDate = (evt.start || "").split("T")[0];
      const evtEnd = (evt.end || evt.start || "").split("T")[0];
      if (evt.allDay && evtDate <= dateStr && evtEnd >= dateStr) {
        (map[evt.member_id] || map.__family__).push(evt);
      } else if (evtDate === dateStr) {
        (map[evt.member_id] || map.__family__).push(evt);
      }
    });
    return map;
  }, [members, events, dateStr]);

  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);
  const totalHeight = (DAY_END - DAY_START) * HOUR_HEIGHT;

  // Count day events for the empty state
  const dayEventCount = events.filter((e) => {
    const d = (e.start || "").split("T")[0];
    return d === dateStr || (e.allDay && d <= dateStr);
  }).length;

  return (
    <Card sx={{ overflow: "hidden", borderRadius: "20px" }}>
      {/* All-day events */}
      {(() => {
        const allDay = events.filter((e) => e.allDay && (e.start || "").split("T")[0] <= dateStr && ((e.end || e.start || "").split("T")[0]) >= dateStr);
        if (!allDay.length) return null;
        return (
          <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1, flexWrap: "wrap", bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}>
            <Icon sx={{ fontSize: "1rem !important", color: "text.disabled", mt: 0.25 }}>wb_sunny</Icon>
            {allDay.map((evt) => {
              const m = members.find((x) => x.id === evt.member_id);
              return (
                <Chip key={evt.id} label={evt.title} size="small" onClick={(e) => onEventClick(evt, e)}
                  icon={evt.recurrence_rule ? <Icon sx={{ fontSize: "0.8rem !important" }}>repeat</Icon> : undefined}
                  sx={{ bgcolor: m ? `${m.avatar_color}18` : "background.paper", color: m ? m.avatar_color : "text.primary", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", border: "1px solid", borderColor: m ? `${m.avatar_color}30` : "divider" }}
                />
              );
            })}
          </Box>
        );
      })()}

      {/* Column headers */}
      <Box sx={{ display: "flex", borderBottom: "2px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Box sx={{ width: timeColW, flexShrink: 0 }} />
        {members.map((m) => (
          <Box key={m.id} sx={{ flex: 1, py: 2, textAlign: "center", minWidth: 0, borderLeft: "1px solid", borderColor: "divider" }}>
            <Avatar src={m.avatar_url || undefined}
              sx={{ width: isSmall ? 40 : 48, height: isSmall ? 40 : 48, bgcolor: m.avatar_color, mx: "auto", mb: 0.75, fontSize: "1rem", boxShadow: `0 4px 12px ${m.avatar_color}35`, border: "3px solid", borderColor: "background.paper" }}
            >
              <Icon sx={{ fontSize: "1.3rem !important", color: "#fff" }}>person</Icon>
            </Avatar>
            <Typography variant="caption" fontWeight={700} sx={{ color: "text.primary", display: "block", fontSize: isSmall ? "0.65rem" : "0.75rem" }}>
              {m.name}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 0.25 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: m.google_calendar_id ? "success.main" : "text.disabled" }} />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Timeline */}
      <Box ref={scrollRef} sx={{ position: "relative", height: { xs: "55vh", sm: "62vh", md: "68vh" }, overflowY: "auto", overflowX: "hidden" }}>
        <Box sx={{ position: "relative", height: totalHeight, minHeight: "100%" }}>
          {/* Hour rows */}
          {hours.map((h) => (
            <Box key={h} sx={{ position: "absolute", top: (h - DAY_START) * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT, display: "flex" }}>
              <Box sx={{ width: timeColW, flexShrink: 0, pr: 0.75, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", pt: "2px" }}>
                <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontWeight: 500, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                  {fmtTimeLabel(h)}
                </Typography>
              </Box>
              {members.map((m) => (
                <Box key={m.id} onClick={() => onTimeClick(dateStr, `${String(h).padStart(2, "0")}:00`, m.id)}
                  sx={{
                    flex: 1,
                    borderLeft: "1px solid",
                    borderColor: "divider",
                    borderBottom: "1px solid",
                    borderBottomColor: tokens.glass.border,
                    cursor: "pointer",
                    position: "relative",
                    "&:hover": { bgcolor: alpha(m.avatar_color, 0.08) },
                    "&::after": {
                      content: '""', position: "absolute", left: 0, right: 0, top: "50%",
                      borderBottom: "1px dashed",
                      borderColor: tokens.glass.border,
                      opacity: 0.7,
                    },
                  }}
                />
              ))}
            </Box>
          ))}

          {/* Now indicator */}
          {isToday && currentHour >= DAY_START && currentHour <= DAY_END && (
            <Box sx={{ position: "absolute", top: (currentHour - DAY_START) * HOUR_HEIGHT, left: timeColW - 6, right: 0, zIndex: 10, pointerEvents: "none" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, height: 2, bgcolor: "error.main" }} />
              </Box>
            </Box>
          )}

          {/* Member events — with overlap detection (Google Calendar style) */}
          {members.map((m, mIdx) => {
            const colWidth = `calc((100% - ${timeColW}px) / ${members.length})`;
            const evts = (memberEvents[m.id] || []).filter((e) => !e.allDay).map((evt) => {
              const s = new Date(evt.start);
              const e = evt.end ? new Date(evt.end) : new Date(s.getTime() + 3600000);
              return { ...evt, _s: s, _e: e, _sH: s.getHours() + s.getMinutes() / 60, _eH: e.getHours() + e.getMinutes() / 60 };
            }).sort((a, b) => a._sH - b._sH || a._eH - b._eH);

            // Assign overlap columns (Google Calendar algorithm)
            const columns = [];
            evts.forEach((evt) => {
              let placed = false;
              for (let col = 0; col < columns.length; col++) {
                const lastInCol = columns[col][columns[col].length - 1];
                if (evt._sH >= lastInCol._eH) { // No overlap
                  columns[col].push(evt);
                  evt._col = col;
                  placed = true;
                  break;
                }
              }
              if (!placed) {
                evt._col = columns.length;
                columns.push([evt]);
              }
            });
            const totalCols = columns.length || 1;

            return evts.map((evt) => {
              const top = Math.max(0, (evt._sH - DAY_START)) * HOUR_HEIGHT;
              const height = Math.max(28, (evt._eH - evt._sH) * HOUR_HEIGHT);
              const col = evt._col || 0;
              // Within the member column, split width for overlapping events
              const subWidth = totalCols > 1 ? `calc((${colWidth} - 6px) / ${totalCols})` : `calc(${colWidth} - 6px)`;
              const subLeft = totalCols > 1
                ? `calc(${timeColW}px + ${colWidth} * ${mIdx} + 3px + (${colWidth} - 6px) * ${col} / ${totalCols})`
                : `calc(${timeColW}px + ${colWidth} * ${mIdx} + 3px)`;

              return (
                <Box key={evt.id} onClick={(e) => onEventClick(evt, e)}
                  sx={{
                    position: "absolute", top, height,
                    left: subLeft,
                    width: subWidth,
                    background: alpha(m.avatar_color, 0.18),
                    color: m.avatar_color,
                    borderLeft: `4px solid ${m.avatar_color}`,
                    borderRadius: "10px",
                    px: totalCols > 1 ? "8px" : "14px", py: totalCols > 1 ? "6px" : "10px",
                    cursor: "pointer", overflow: "hidden", zIndex: 4,
                    boxShadow: `0 2px 8px ${alpha(m.avatar_color, 0.2)}`,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: `0 4px 16px ${alpha(m.avatar_color, 0.3)}`, zIndex: 6 },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: height > 40 && totalCols < 3 ? "0.75rem" : "0.6rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3, display: "flex", alignItems: "center", gap: 0.5 }}>
                    {evt.recurrence_rule && <Icon sx={{ fontSize: "0.7rem !important", opacity: 0.7 }}>repeat</Icon>}
                    {evt.title}
                  </Typography>
                  {height > 36 && totalCols < 3 && (
                    <Typography sx={{ fontSize: "0.55rem", opacity: 0.7, mt: 0.25 }}>
                      {fmtTime(evt._s)} - {fmtTime(evt._e)}
                    </Typography>
                  )}
                </Box>
              );
            });
          })}

          {/* Family events */}
          {(memberEvents.__family__ || []).filter((e) => !e.allDay).map((evt) => {
            const s = new Date(evt.start);
            const e = evt.end ? new Date(evt.end) : new Date(s.getTime() + 3600000);
            const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - DAY_START)) * HOUR_HEIGHT;
            const height = Math.max(28, ((e.getHours() + e.getMinutes() / 60) - (s.getHours() + s.getMinutes() / 60)) * HOUR_HEIGHT);
            return (
              <Box key={evt.id} onClick={(e) => onEventClick(evt, e)}
                sx={{ position: "absolute", top, height, left: `calc(${timeColW}px + 3px)`, right: 3, background: alpha(tokens.accent.main, 0.05), border: `1px dashed ${alpha(tokens.accent.main, 0.15)}`, borderLeft: `4px dashed ${alpha(tokens.accent.main, 0.3)}`, color: tokens.accent.main, borderRadius: "10px", px: "14px", py: "10px", cursor: "pointer", zIndex: 2, display: "flex", alignItems: "center" }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: tokens.accent.main }}>{evt.title}</Typography>
              </Box>
            );
          })}

          {/* Empty state */}
          {dayEventCount === 0 && (
            <Box sx={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1, pointerEvents: "none" }}>
              <Icon sx={{ fontSize: "3rem !important", color: "text.disabled", opacity: 0.3, mb: 1 }}>event_available</Icon>
              <Typography variant="body2" sx={{ color: "text.disabled", opacity: 0.5, fontWeight: 500 }}>Nothing scheduled — enjoy the day!</Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", opacity: 0.4 }}>Tap a time slot or + to add an event</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}

// ── Main ──

function FamilyCalendar() {
  const [state, dispatch] = useFamilyController();
  const { family, members, events, tasks, notes, countdowns, meals, messages } = state;
  const isDashboard = state.isDashboard || false; // Skip Google auth in dashboard mode
  const { tokens, alpha, gradient, darkMode } = useAppTheme();
  const calendarRef = useRef(null);
  const isSmall = useMediaQuery("(max-width:599px)");

  const [viewTab, setViewTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(defaultEventForm());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");

  // Icon Rail + Expandable Panel state
  const [activePanel, setActivePanel] = useState(null); // null | "messages" | "notes" | "countdowns" | "chores" | "dinner" | "mood" | "event-edit" | "event-comments"
  const [previousPanel, setPreviousPanel] = useState(null); // restore after event edit
  const [peekCard, setPeekCard] = useState(null); // { event, anchorRect }

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewTab === 0 ? 1 : viewTab === 1 ? 7 : 30)); setCurrentDate(d); };
  const goNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewTab === 0 ? 1 : viewTab === 1 ? 7 : 30)); setCurrentDate(d); };

  const isToday = fmtDate(new Date()) === fmtDate(currentDate);
  const dateLabel = viewTab === 0
    ? (isSmall ? `${DAYS_SHORT[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()].slice(0, 3)} ${currentDate.getDate()}` : `${DAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}`)
    : viewTab === 1
    ? `Week of ${MONTHS[currentDate.getMonth()].slice(0, 3)} ${currentDate.getDate()}`
    : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Compute view range for recurring event expansion
  const viewRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    if (viewTab === 0) {
      // Day view: just this day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewTab === 1) {
      // Week view: current week
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Month view: current month + buffer
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 6);
      end.setHours(23, 59, 59, 999);
    }
    return { start: fmtDate(start), end: fmtDate(end) };
  }, [currentDate, viewTab]);

  // Expand recurring events for the current view
  const expandedEvents = useMemo(
    () => expandRecurringEvents(events, viewRange.start, viewRange.end),
    [events, viewRange]
  );

  // FullCalendar events
  const fcEvents = useMemo(() => expandedEvents.map((evt) => ({
    id: evt.id, title: evt.title, start: evt.start, end: evt.end, allDay: evt.allDay,
    className: `event-${evt.className || "info"}`,
    extendedProps: { member_id: evt.member_id, isRecurrence: evt.isRecurrence, recurrence_rule: evt.recurrence_rule },
  })), [expandedEvents]);

  // Event handlers
  // Open peek card near tapped event (DayTimeline custom view)
  const handleEventClick = useCallback((evt, domEvent) => {
    const targetEvt = evt.isRecurrence
      ? events.find((e) => e.id === evt.originalEventId) || evt
      : evt;
    const rect = domEvent?.target?.getBoundingClientRect?.() || { top: 300, bottom: 340, left: 300 };
    setPeekCard({ event: targetEvt, anchorRect: rect });
  }, [events]);

  // Prepare event form for editing in the panel
  const openEventInPanel = useCallback((evt, panelMode) => {
    const targetEvt = evt.isRecurrence
      ? events.find((e) => e.id === evt.originalEventId) || evt
      : evt;
    const s = new Date(targetEvt.start);
    const e = targetEvt.end ? new Date(targetEvt.end) : s;
    setEditingEvent(targetEvt);
    setEventForm({
      title: targetEvt.title,
      member_id: targetEvt.member_id || "",
      startDate: fmtDate(s),
      startTime: targetEvt.allDay ? "09:00" : fmtTime(s),
      endDate: fmtDate(e),
      endTime: targetEvt.allDay ? "10:00" : fmtTime(e),
      allDay: targetEvt.allDay || false,
      recurrence_rule: targetEvt.recurrence_rule || "",
      reminder_minutes: targetEvt.reminder_minutes ?? "",
    });
    setPreviousPanel(activePanel);
    setActivePanel(panelMode || "event-edit");
    setPeekCard(null);
  }, [events, activePanel]);

  const handlePeekEdit = useCallback((evt) => openEventInPanel(evt, "event-edit"), [openEventInPanel]);
  const handlePeekComment = useCallback((evt) => openEventInPanel(evt, "event-comments"), [openEventInPanel]);
  const handlePeekDelete = useCallback((evt) => {
    setPeekCard(null);
    if (!isDashboard) {
      const existing = events.find(e => e.id === evt.id);
      if (existing?.google_event_id && existing.member_id) {
        const member = members.find(m => m.id === existing.member_id);
        if (member) deleteSyncedEvent(member, existing.google_event_id).catch(() => {});
      }
    }
    dispatch({ type: "REMOVE_EVENT", value: evt.id });
  }, [events, members, dispatch, isDashboard]);

  const handleFcEventClick = useCallback((info) => {
    const evt = expandedEvents.find((e) => e.id === info.event.id);
    if (evt) handleEventClick(evt, info.jsEvent);
  }, [expandedEvents, handleEventClick]);

  const handleTimeClick = useCallback((dateStr, time, memberId) => {
    const [h] = time.split(":").map(Number);
    setEditingEvent(null);
    setEventForm({ title: "", member_id: memberId || "", startDate: dateStr, startTime: time, endDate: dateStr, endTime: `${String(h + 1).padStart(2, "0")}:00`, allDay: false });
    setPreviousPanel(activePanel);
    setActivePanel("event-edit");
    setPeekCard(null);
  }, [activePanel]);

  const handleFcDateClick = useCallback((info) => {
    setEditingEvent(null);
    setEventForm(defaultEventForm(info.dateStr.split("T")[0]));
    setPreviousPanel(activePanel);
    setActivePanel("event-edit");
    setPeekCard(null);
  }, [activePanel]);

  const handleFormChange = useCallback((field, value) => {
    setEventForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" && next.endDate < next.startDate) next.endDate = next.startDate;
      return next;
    });
  }, []);

  const handleSaveEvent = useCallback(() => {
    const { title, member_id, startDate, startTime, endDate, endTime, allDay, recurrence_rule, reminder_minutes } = eventForm;
    if (!title.trim()) return;
    const member = members.find((m) => m.id === member_id);
    const gradient = getMemberGradient(member);
    // Convert local time to proper UTC ISO string for Supabase (timestamptz)
    // Parse as local time by manually constructing the Date object
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startLocal = new Date(startYear, startMonth - 1, startDay, startHour, startMin);
    const start = allDay ? startDate : startLocal.toISOString();

    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const endLocal = new Date(endYear, endMonth - 1, endDay, endHour, endMin);
    const end = allDay ? endDate : endLocal.toISOString();
    if (editingEvent) {
      const existingEvent = events.find(e => e.id === editingEvent.id);

      // Close panel FIRST so UI feels instant
      setActivePanel(previousPanel); setEditingEvent(null);

      // Update local state immediately
      dispatch({
        type: "UPDATE_EVENT",
        value: {
          id: editingEvent.id,
          title: title.trim(),
          member_id: member_id || null,
          start,
          end,
          allDay,
          className: gradient,
          source: existingEvent?.source || "manual",
          google_event_id: existingEvent?.google_event_id || null,
          recurrence_rule: recurrence_rule || null,
          reminder_minutes: reminder_minutes === "" ? null : Number(reminder_minutes),
        }
      });
      // Google push in background after UI updates
      if (existingEvent?.google_event_id && !isDashboard) {
        const memberForPush = members.find(m => m.id === (member_id || existingEvent.member_id));
        if (memberForPush?.google_calendar_id) {
          setTimeout(() => pushEventUpdateToGoogle(memberForPush, { ...existingEvent, title: title.trim(), start, end, allDay }).catch(() => {}), 100);
        }
      }
      return;
    } else {
      const newEventId = crypto.randomUUID();
      const newEvent = {
        id: newEventId,
        family_id: family.id,
        member_id: member_id || null,
        title: title.trim(),
        start,
        end,
        allDay,
        className: gradient,
        source: "manual",
        google_event_id: null,
        recurrence_rule: recurrence_rule || null,
        reminder_minutes: reminder_minutes === "" ? null : Number(reminder_minutes),
      };
      // Close panel FIRST so UI feels instant
      setActivePanel(previousPanel); setEditingEvent(null);

      // Add to local state immediately — UI updates now
      dispatch({
        type: "ADD_EVENT",
        value: newEvent
      });

      // Google push: wait 500ms for Supabase INSERT to complete, then push
      if (member?.google_calendar_id && !isDashboard) {
        setTimeout(() => {
          pushEventToGoogle(member, newEvent).then(googleId => {
            if (googleId) {
              dispatch({ type: "UPDATE_EVENT", value: { id: newEventId, google_event_id: googleId, source: "synced" } });
            }
          }).catch(() => {});
        }, 500);
      }
      return;
    }
    setActivePanel(previousPanel); setEditingEvent(null);
  }, [eventForm, editingEvent, members, family.id, events, dispatch, previousPanel]);

  const handleDeleteEvent = useCallback(async () => {
    if (editingEvent) {
      // If this was a synced event, delete from Google too (skip on dashboard/kiosk)
      if (!isDashboard) {
        const evt = events.find(e => e.id === editingEvent.id);
        if (evt?.google_event_id && evt.member_id) {
          const member = members.find(m => m.id === evt.member_id);
          if (member) {
            await deleteSyncedEvent(member, evt.google_event_id);
          }
        }
      }
      dispatch({ type: "REMOVE_EVENT", value: editingEvent.id });
    }
    setActivePanel(previousPanel); setEditingEvent(null);
  }, [editingEvent, events, members, dispatch, previousPanel]);

  const handleCloseDialog = useCallback(() => {
    setActivePanel(previousPanel);
    setEditingEvent(null);
    setEventForm(defaultEventForm());
  }, []);

  // Sync
  const handleSync = useCallback(async () => {
    // Dashboard/kiosk: trigger server-side sync instead of client-side
    if (isDashboard) {
      setSyncing(true); setSyncMessage("Syncing via server...");
      try {
        const cachedToken = localStorage.getItem(`famcal_dashboard_token_${window.location.pathname.split("/d/")[1]}`);
        if (cachedToken) {
          const res = await fetch(apiUrl(`/api/google-sync?familyId=${family.id}&token=${cachedToken}`));
          const result = await res.json();
          setSyncMessage(result.synced > 0 ? `Synced ${result.synced} calendar(s)` : "All up to date");
        }
      } catch { setSyncMessage("Server sync failed"); }
      setTimeout(() => setSyncMessage(""), 5000);
      setSyncing(false);
      return;
    }

    setSyncing(true); setSyncMessage("Syncing...");
    try {
      // silentOnly=true — don't open popups for expired members during sync.
      const results = await syncAllMembers(members, events, family.id, dispatch, true);
      setLastSyncTime(new Date());

      const entries = Object.entries(results);
      let totalPulled = 0;
      let totalPushed = 0;
      const errorNames = [];

      entries.forEach(([id, r]) => {
        const name = members.find((m) => m.id === id)?.name || "Unknown";
        if (r.error) {
          errorNames.push(name);
          console.warn(`[sync] ${name}: ${r.error}`);
        } else {
          totalPulled += r.pulled || 0;
          totalPushed += r.pushed || 0;
          if (r.pulled || r.pushed) console.log(`[sync] ${name}: pulled ${r.pulled}, pushed ${r.pushed}`);
        }
      });

      const parts = [];
      if (totalPulled + totalPushed > 0) parts.push(`${totalPulled + totalPushed} events synced`);
      else if (entries.length > 0 && errorNames.length === 0) parts.push("All up to date");
      if (errorNames.length > 0) parts.push(`${errorNames.join(", ")} need reconnect`);
      setSyncMessage(parts.join(" | ") || "Sync complete");
      setTimeout(() => setSyncMessage(""), 8000);
    } catch (err) {
      console.error("[sync] Error:", err);
      setSyncMessage(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncMessage(""), 8000);
    }
    setSyncing(false);
  }, [members, events, family.id, dispatch]);

  const handleConnectMember = useCallback(async (member) => {
    let memberId = member.id;
    if (memberId.startsWith("member-")) {
      const fresh = members.find((m) => m.name === member.name && !m.id.startsWith("member-"));
      if (fresh) memberId = fresh.id;
    }
    setConnectingId(memberId);
    try {
      const result = await connectMemberCalendar(memberId);
      dispatch({ type: "UPDATE_MEMBER", value: { id: memberId, google_calendar_id: result.calendarId, has_server_sync: !!result.refreshTokenStored } });
    } catch (err) {
      console.warn("Connect failed:", err.message);
    }
    setConnectingId(null);
  }, [dispatch, members]);

  const handleDisconnectMember = useCallback((member) => {
    disconnectMemberCalendar(member.id);
    dispatch({ type: "UPDATE_MEMBER", value: { id: member.id, google_calendar_id: "" } });
  }, [dispatch]);

  const connectedCount = members.filter((m) => m.google_calendar_id && (hasValidToken(m.id) || m.has_server_sync)).length;
  const syncTooltip = lastSyncTime ? `Last: ${lastSyncTime.toLocaleTimeString()}` : "Sync calendars";

  // Auto-sync: initial sync on load + background polling every 30s
  const syncingRef = useRef(false);
  const pollRef = useRef(null);

  // Silent sync (no UI feedback unless changes found)
  const silentSync = useCallback(async () => {
    if (syncingRef.current || connectedCount === 0) return;
    syncingRef.current = true;
    try {
      const results = await syncAllMembers(members, events, family.id, dispatch, true);
      setLastSyncTime(new Date());
      const totalChanges = Object.values(results).reduce((sum, r) => sum + (r.pulled || 0) + (r.pushed || 0), 0);
      if (totalChanges > 0) {
        setSyncMessage(`${totalChanges} events synced`);
        setTimeout(() => setSyncMessage(""), 5000);
      }
    } catch (err) {
      console.warn("[auto-sync]", err.message);
    }
    syncingRef.current = false;
  }, [members, events, family.id, dispatch, connectedCount]);

  // Skip client-side auto-sync if ALL connected members have server sync (cron handles it)
  const allServerSynced = members.every((m) => !m.google_calendar_id || m.has_server_sync);

  useEffect(() => {
    if (isDashboard || connectedCount === 0 || members.length === 0) return;
    // If all members have server-side sync, skip client polling entirely
    // Server cron runs every 15min — client sync is redundant and causes race conditions
    if (allServerSynced) {
      console.log("[calendar] All members have server sync — skipping client auto-sync");
      return;
    }

    // Fallback: client-side polling for members without server sync (no refresh token)
    const initTimer = setTimeout(silentSync, 1500);

    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(silentSync, 30000);
    };
    const stopPolling = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        silentSync();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(initTimer);
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [connectedCount, members.length, silentSync, allServerSynced]);

  // ── Widget Definitions ──

  // Notes widget
  const notesWidget = (
    <NotesWidget
      notes={notes}
      members={members}
      dispatch={dispatch}
      familyId={family?.id}
    />
  );

  // Countdown widget
  const countdownWidget = (
    <CountdownWidget
      variant="sidebar"
      countdowns={countdowns}
      members={members}
      dispatch={dispatch}
      familyId={family?.id}
    />
  );

  // Messages widget
  const messagesWidget = (
    <MessageBoard
      messages={messages || []}
      members={members}
      dispatch={dispatch}
      familyId={family?.id}
    />
  );

  // Today's chores mini-widget
  const todayStr = fmtDate(new Date());
  const todayTasks = tasks.filter(t => t.due_date === todayStr && !t.completed);
  const completedToday = tasks.filter(t => t.due_date === todayStr && t.completed);

  const todayChoresWidget = (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
          {completedToday.length}/{completedToday.length + todayTasks.length} done
        </Typography>
      </Box>
      {todayTasks.slice(0, 3).map(task => {
        const member = members.find(m => m.id === task.assigned_to);
        return (
          <Box key={task.id} sx={{
            display: "flex", alignItems: "center", gap: 1,
            py: 0.5, px: 1, borderRadius: "8px", mb: 0.5,
            cursor: "pointer",
            "&:hover": { background: "rgba(0,0,0,0.03)" },
          }}
            onClick={() => dispatch({ type: "COMPLETE_TASK", value: { taskId: task.id, memberId: task.assigned_to } })}
          >
            <Icon sx={{ fontSize: "1rem", color: "text.disabled" }}>radio_button_unchecked</Icon>
            <Typography sx={{ fontSize: "0.78rem", flex: 1 }}>{task.title}</Typography>
            <Typography sx={{ fontSize: "0.65rem", color: "warning.main", fontWeight: 700 }}>
              +{task.points_value || 10}
            </Typography>
          </Box>
        );
      })}
      {todayTasks.length === 0 && (
        <Typography variant="caption" color="text.secondary">All done for today!</Typography>
      )}
    </Box>
  );

  // Tonight's dinner mini-widget
  const todayDinner = meals.find(m => m.date === todayStr && m.meal_type === "dinner");
  const tonightDinnerWidget = todayDinner ? (
    <Box sx={{
      p: 1.5,
      background: darkMode ? alpha(tokens.accent.main, 0.06) : gradient(tokens.accent.main, "#00b894", 135, 0.06),
      borderRadius: "12px", textAlign: "center"
    }}>
      <Typography sx={{ fontSize: "1.05rem", fontWeight: 800 }}>{todayDinner.title}</Typography>
      {todayDinner.notes && (
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>{todayDinner.notes}</Typography>
      )}
    </Box>
  ) : (
    <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
      No dinner planned
    </Typography>
  );

  // Mood widget for sidebar
  const moodWidget = <MoodBoard variant="widget" />;

  return (
    <PageShell flush>
      {/* Full-height flex: calendar area + icon rail + panel */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: header + calendar (takes remaining space) */}
        <Box sx={{ flex: 1, overflow: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header - date nav + view tabs */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1, px: { xs: 0, sm: 0.5 } }}>
              {/* Left: compact date nav */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton size="small" onClick={goPrev} sx={{ bgcolor: "action.hover", width: 32, height: 32 }}><Icon>chevron_left</Icon></IconButton>
                <IconButton size="small" onClick={goNext} sx={{ bgcolor: "action.hover", width: 32, height: 32 }}><Icon>chevron_right</Icon></IconButton>
                {!isToday && <Chip label="Today" size="small" onClick={goToday} sx={{ fontWeight: 600, cursor: "pointer", bgcolor: tokens.accent.main, color: "#fff", "&:hover": { bgcolor: tokens.accent.dark } }} />}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {syncMessage || (connectedCount > 0 ? `${connectedCount} calendar${connectedCount > 1 ? "s" : ""} connected` : "No calendars connected")}
                </Typography>
              </Box>

              {/* Right: view toggle + sync */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ bgcolor: alpha(tokens.accent.main, 0.08), borderRadius: "12px", p: "3px", display: "inline-flex" }}>
                  <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)}
                    sx={{ minHeight: 34,
                      "& .MuiTabs-indicator": { borderRadius: "9px", height: "100%", background: gradient("primary"), boxShadow: `0 2px 8px ${alpha(tokens.accent.main, 0.25)}` },
                      "& .MuiTab-root": { minHeight: 30, py: 0, px: 2.5, fontSize: "0.75rem", fontWeight: 700, zIndex: 1, color: "text.secondary", transition: "color 0.2s", "&.Mui-selected": { color: "#fff" } },
                    }}
                  >
                    <Tab label="Day" />
                    <Tab label="Week" />
                    <Tab label="Month" />
                  </Tabs>
                </Box>
                <Tooltip title={syncTooltip} arrow>
                  <span>
                    <IconButton size="small" onClick={handleSync} disabled={syncing || connectedCount === 0}
                      sx={{ bgcolor: "action.hover", width: 34, height: 34 }}
                    >
                      <Icon sx={{ fontSize: "1.1rem !important", animation: syncing ? "spin 1s linear infinite" : "none", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } } }}>sync</Icon>
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </motion.div>

          {/* Calendar content (scrollable) */}
          <Box sx={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          {/* Day View */}
          {viewTab === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <DayTimeline date={currentDate} members={members} events={expandedEvents} onEventClick={handleEventClick} onTimeClick={handleTimeClick} darkMode={darkMode} />
            </motion.div>
          )}

          {/* Week View */}
          {viewTab === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <Card sx={{ overflow: "hidden", borderRadius: "20px" }}>
                <CardContent sx={{ p: { xs: 1, sm: 2 }, "&:last-child": { pb: { xs: 1, sm: 2 } } }}>
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    initialDate={currentDate}
                    headerToolbar={false}
                    events={fcEvents}
                    dateClick={handleFcDateClick}
                    eventClick={handleFcEventClick}
                    height={isSmall ? "55vh" : "68vh"}
                    nowIndicator
                    editable={false}
                    selectable={false}
                    eventDisplay="block"
                    allDaySlot={true}
                    slotMinTime="06:00:00"
                    slotMaxTime="23:00:00"
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Month View */}
          {viewTab === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <Card sx={{ overflow: "hidden", borderRadius: "20px" }}>
                <CardContent sx={{ p: { xs: 1, sm: 2 }, "&:last-child": { pb: { xs: 1, sm: 2 } } }}>
                  <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth" headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                    events={fcEvents} dateClick={handleFcDateClick} eventClick={handleFcEventClick}
                    height={isSmall ? "55vh" : "65vh"} dayMaxEvents={isSmall ? 2 : 4}
                    nowIndicator editable={false} selectable={false} eventDisplay="block"
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
          </Box>
        </Box>

        {/* Icon Rail */}
        <IconRail
          items={[
            { key: "messages", icon: "forum", label: "Messages", badge: (messages || []).filter(m => m.urgent).length },
            { key: "notes", icon: "sticky_note_2", label: "Notes", badge: notes.filter(n => { const age = Date.now() - new Date(n.created_at).getTime(); return n.pinned || age < 86400000; }).length },
            { key: "countdowns", icon: "timer", label: "Countdowns", badge: 0 },
            { key: "chores", icon: "task_alt", label: "Today's Chores", badge: tasks.filter(t => t.due_date === fmtDate(new Date()) && !t.completed).length },
            { key: "dinner", icon: "restaurant", label: "Tonight's Dinner", badge: 0 },
            { key: "mood", icon: "mood", label: "Mood Check-In", badge: 0 },
          ]}
          activeKey={activePanel && !activePanel.startsWith("event-") ? activePanel : null}
          onSelect={(key) => { setPeekCard(null); setActivePanel(key); }}
        />

        {/* Expandable Panel */}
        <ExpandablePanel
          open={activePanel !== null}
          title={
            activePanel === "messages" ? "Messages"
            : activePanel === "notes" ? "Notes"
            : activePanel === "countdowns" ? "Countdowns"
            : activePanel === "chores" ? "Today's Chores"
            : activePanel === "dinner" ? "Tonight's Dinner"
            : activePanel === "mood" ? "Mood Check-In"
            : activePanel === "event-edit" ? (editingEvent ? "Edit Event" : "New Event")
            : activePanel === "event-comments" ? "Comments"
            : ""
          }
          icon={
            activePanel === "messages" ? "forum"
            : activePanel === "notes" ? "sticky_note_2"
            : activePanel === "countdowns" ? "timer"
            : activePanel === "chores" ? "task_alt"
            : activePanel === "dinner" ? "restaurant"
            : activePanel === "mood" ? "mood"
            : activePanel?.startsWith("event-") ? "calendar_today"
            : ""
          }
          contentKey={activePanel}
          onClose={() => {
            if (activePanel?.startsWith("event-")) {
              setEditingEvent(null);
              setActivePanel(previousPanel);
            } else {
              setActivePanel(null);
            }
          }}
        >
          {/* Widget content */}
          {activePanel === "messages" && messagesWidget}
          {activePanel === "notes" && notesWidget}
          {activePanel === "countdowns" && countdownWidget}
          {activePanel === "chores" && todayChoresWidget}
          {activePanel === "dinner" && tonightDinnerWidget}
          {activePanel === "mood" && moodWidget}

          {/* Event edit form */}
          {activePanel === "event-edit" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label="Event Title" value={eventForm.title} onChange={(e) => handleFormChange("title", e.target.value)} fullWidth autoFocus placeholder="What's happening?" />
              <TextField label="Assign to" value={eventForm.member_id} onChange={(e) => handleFormChange("member_id", e.target.value)} select fullWidth>
                <MenuItem value=""><em>Family Event</em></MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: m.avatar_color }} />
                      {m.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel control={<Switch checked={eventForm.allDay} onChange={(e) => handleFormChange("allDay", e.target.checked)} />} label="All Day" />
              <TextField label="Repeat" value={eventForm.recurrence_rule || ""} onChange={(e) => handleFormChange("recurrence_rule", e.target.value)} select fullWidth>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <TextField label="Reminder" value={eventForm.reminder_minutes ?? ""} onChange={(e) => handleFormChange("reminder_minutes", e.target.value)} select fullWidth>
                {REMINDER_OPTIONS.map((opt) => (
                  <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Start Date" type="date" value={eventForm.startDate} onChange={(e) => handleFormChange("startDate", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                {!eventForm.allDay && <TextField label="Start Time" type="time" value={eventForm.startTime} onChange={(e) => handleFormChange("startTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />}
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="End Date" type="date" value={eventForm.endDate} onChange={(e) => handleFormChange("endDate", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ min: eventForm.startDate }} />
                {!eventForm.allDay && <TextField label="End Time" type="time" value={eventForm.endTime} onChange={(e) => handleFormChange("endTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />}
              </Box>
              {editingEvent && editingEvent.id && !editingEvent.id.startsWith("evt-") && (
                <EventComments eventId={editingEvent.id} familyId={family.id} members={members} />
              )}
              {/* Actions */}
              <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                {editingEvent && <Button onClick={handleDeleteEvent} color="error" variant="outlined" startIcon={<Icon>delete</Icon>} sx={{ mr: "auto", borderRadius: "12px" }}>Delete</Button>}
                <Button onClick={handleCloseDialog} variant="outlined" sx={{ borderRadius: "12px" }}>Cancel</Button>
                <Button onClick={handleSaveEvent} variant="contained" disabled={!eventForm.title.trim()} sx={{ borderRadius: "12px", background: gradient(tokens.accent.main, tokens.accent.light) }}>
                  {editingEvent ? "Save" : "Add Event"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Event comments only */}
          {activePanel === "event-comments" && editingEvent && editingEvent.id && !editingEvent.id.startsWith("evt-") && (
            <EventComments eventId={editingEvent.id} familyId={family.id} members={members} />
          )}
        </ExpandablePanel>
      </Box>

      {/* Event Peek Card — floating near tapped event */}
      <EventPeekCard
        event={peekCard?.event}
        anchorRect={peekCard?.anchorRect}
        members={members}
        commentCount={0}
        onEdit={handlePeekEdit}
        onComment={handlePeekComment}
        onDelete={handlePeekDelete}
        onClose={() => setPeekCard(null)}
      />
    </PageShell>
  );
}

export default FamilyCalendar;
