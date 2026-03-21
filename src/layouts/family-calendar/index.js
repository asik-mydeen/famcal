import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
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
import { syncAllMembers, connectMemberCalendar, disconnectMemberCalendar, deleteSyncedEvent, pushEventToGoogle, pushEventUpdateToGoogle, pushEventDeleteToGoogle } from "lib/googleCalendar";
import { useThemeMode } from "context/ThemeContext";
import SmartSidebar from "components/SmartSidebar";
import NotesWidget from "components/NotesWidget";
import CountdownWidget from "components/CountdownWidget";

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

function defaultEventForm(dateStr) {
  const today = dateStr || fmtDate(new Date());
  return { title: "", member_id: "", startDate: today, startTime: "09:00", endDate: today, endTime: "10:00", allDay: false };
}

// ── Day Timeline ──

DayTimeline.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  members: PropTypes.array.isRequired,
  events: PropTypes.array.isRequired,
  onEventClick: PropTypes.func.isRequired,
  onTimeClick: PropTypes.func.isRequired,
};

function DayTimeline({ date, members, events, onEventClick, onTimeClick }) {
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
                <Chip key={evt.id} label={evt.title} size="small" onClick={() => onEventClick(evt)}
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
                <Typography sx={{ color: "#8B8680", fontSize: "0.72rem", fontWeight: 500, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                  {fmtTimeLabel(h)}
                </Typography>
              </Box>
              {members.map((m) => (
                <Box key={m.id} onClick={() => onTimeClick(dateStr, `${String(h).padStart(2, "0")}:00`, m.id)}
                  sx={{ flex: 1, borderLeft: "1px solid", borderColor: "divider", borderBottom: "1px solid", borderBottomColor: "divider", cursor: "pointer", position: "relative", "&:hover": { bgcolor: `${m.avatar_color}08` },
                    "&::after": { content: '""', position: "absolute", left: 0, right: 0, top: "50%", borderBottom: "1px dashed", borderColor: "divider", opacity: 0.4 },
                  }}
                />
              ))}
            </Box>
          ))}

          {/* Now indicator */}
          {isToday && currentHour >= DAY_START && currentHour <= DAY_END && (
            <Box sx={{ position: "absolute", top: (currentHour - DAY_START) * HOUR_HEIGHT, left: timeColW - 6, right: 0, zIndex: 10, pointerEvents: "none" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#E17055", flexShrink: 0 }} />
                <Box sx={{ flex: 1, height: 2, bgcolor: "#E17055" }} />
              </Box>
            </Box>
          )}

          {/* Member events */}
          {members.map((m, mIdx) => {
            const colWidth = `calc((100% - ${timeColW}px) / ${members.length})`;
            return (memberEvents[m.id] || []).filter((e) => !e.allDay).map((evt) => {
              const s = new Date(evt.start);
              const e = evt.end ? new Date(evt.end) : new Date(s.getTime() + 3600000);
              const sH = s.getHours() + s.getMinutes() / 60;
              const eH = e.getHours() + e.getMinutes() / 60;
              const top = Math.max(0, (sH - DAY_START)) * HOUR_HEIGHT;
              const height = Math.max(28, (eH - sH) * HOUR_HEIGHT);
              return (
                <Box key={evt.id} onClick={() => onEventClick(evt)}
                  sx={{
                    position: "absolute", top, height,
                    left: `calc(${timeColW}px + ${colWidth} * ${mIdx} + 3px)`,
                    width: `calc(${colWidth} - 6px)`,
                    background: `${m.avatar_color}18`,
                    color: m.avatar_color,
                    borderLeft: `4px solid ${m.avatar_color}`,
                    borderRadius: "10px",
                    px: "14px", py: "10px",
                    cursor: "pointer", overflow: "hidden", zIndex: 4,
                    boxShadow: `0 2px 8px ${m.avatar_color}20`,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: `0 4px 16px ${m.avatar_color}30`, zIndex: 6 },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: height > 40 ? "0.75rem" : "0.65rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
                    {evt.title}
                  </Typography>
                  {height > 36 && (
                    <Typography sx={{ fontSize: "0.6rem", opacity: 0.7, mt: 0.25 }}>
                      {fmtTime(s)} - {fmtTime(e)}
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
              <Box key={evt.id} onClick={() => onEventClick(evt)}
                sx={{ position: "absolute", top, height, left: `calc(${timeColW}px + 3px)`, right: 3, background: "rgba(108,92,231,0.05)", border: "1px dashed rgba(108,92,231,0.15)", borderLeft: "4px dashed rgba(108,92,231,0.3)", color: "#6C5CE7", borderRadius: "10px", px: "14px", py: "10px", cursor: "pointer", zIndex: 2, display: "flex", alignItems: "center" }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#6C5CE7" }}>{evt.title}</Typography>
              </Box>
            );
          })}

          {/* Empty state */}
          {dayEventCount === 0 && (
            <Box sx={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1, pointerEvents: "none" }}>
              <Icon sx={{ fontSize: "3rem !important", color: "text.disabled", opacity: 0.3, mb: 1 }}>event_available</Icon>
              <Typography variant="body2" sx={{ color: "text.disabled", opacity: 0.5, fontWeight: 500 }}>No events today</Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", opacity: 0.4 }}>Tap a time slot or + to add one</Typography>
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
  const { family, members, events, tasks, notes, countdowns, meals } = state;
  const { darkMode } = useThemeMode();
  const calendarRef = useRef(null);
  const isSmall = useMediaQuery("(max-width:599px)");

  const [viewTab, setViewTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(defaultEventForm());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("famcal_sidebar_collapsed") === "true"
  );

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewTab === 0 ? 1 : 30)); setCurrentDate(d); };
  const goNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewTab === 0 ? 1 : 30)); setCurrentDate(d); };

  const isToday = fmtDate(new Date()) === fmtDate(currentDate);
  const dateLabel = viewTab === 0
    ? (isSmall ? `${DAYS_SHORT[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()].slice(0, 3)} ${currentDate.getDate()}` : `${DAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}`)
    : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // FullCalendar events
  const fcEvents = useMemo(() => events.map((evt) => ({
    id: evt.id, title: evt.title, start: evt.start, end: evt.end, allDay: evt.allDay,
    className: `event-${evt.className || "info"}`,
    extendedProps: { member_id: evt.member_id },
  })), [events]);

  // Event handlers
  const handleEventClick = useCallback((evt) => {
    const s = new Date(evt.start);
    const e = evt.end ? new Date(evt.end) : s;
    setEditingEvent(evt);
    setEventForm({ title: evt.title, member_id: evt.member_id || "", startDate: fmtDate(s), startTime: evt.allDay ? "09:00" : fmtTime(s), endDate: fmtDate(e), endTime: evt.allDay ? "10:00" : fmtTime(e), allDay: evt.allDay || false });
    setDialogOpen(true);
  }, []);

  const handleFcEventClick = useCallback((info) => {
    const evt = events.find((e) => e.id === info.event.id);
    if (evt) handleEventClick(evt);
  }, [events, handleEventClick]);

  const handleTimeClick = useCallback((dateStr, time, memberId) => {
    const [h] = time.split(":").map(Number);
    setEditingEvent(null);
    setEventForm({ title: "", member_id: memberId || "", startDate: dateStr, startTime: time, endDate: dateStr, endTime: `${String(h + 1).padStart(2, "0")}:00`, allDay: false });
    setDialogOpen(true);
  }, []);

  const handleFcDateClick = useCallback((info) => {
    setEditingEvent(null);
    setEventForm(defaultEventForm(info.dateStr.split("T")[0]));
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setEventForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" && next.endDate < next.startDate) next.endDate = next.startDate;
      return next;
    });
  }, []);

  const handleSaveEvent = useCallback(() => {
    const { title, member_id, startDate, startTime, endDate, endTime, allDay } = eventForm;
    if (!title.trim()) return;
    const member = members.find((m) => m.id === member_id);
    const gradient = getMemberGradient(member);
    const start = allDay ? startDate : `${startDate}T${startTime}:00`;
    const end = allDay ? endDate : `${endDate}T${endTime}:00`;
    if (editingEvent) {
      // Preserve source and google_event_id when editing
      const existingEvent = events.find(e => e.id === editingEvent.id);
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
          google_event_id: existingEvent?.google_event_id || null
        }
      });
      // Push update to Google directly if event is synced
      if (existingEvent?.google_event_id) {
        const memberForPush = members.find(m => m.id === (member_id || existingEvent.member_id));
        if (memberForPush?.google_calendar_id) {
          pushEventUpdateToGoogle(memberForPush, { ...existingEvent, title: title.trim(), start, end, allDay }).catch(() => {});
        }
      }
    } else {
      const newEventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
        google_event_id: null
      };
      dispatch({
        type: "ADD_EVENT",
        value: newEvent
      });
      // Push to Google directly if member has calendar connected
      if (member?.google_calendar_id) {
        pushEventToGoogle(member, newEvent).then(googleId => {
          if (googleId) {
            dispatch({ type: "UPDATE_EVENT", value: { id: newEventId, google_event_id: googleId, source: "synced" } });
          }
        });
      }
    }
    setDialogOpen(false); setEditingEvent(null);
  }, [eventForm, editingEvent, members, family.id, events, dispatch]);

  const handleDeleteEvent = useCallback(async () => {
    if (editingEvent) {
      // If this was a synced event, delete from Google too
      const evt = events.find(e => e.id === editingEvent.id);
      if (evt?.google_event_id && evt.member_id) {
        const member = members.find(m => m.id === evt.member_id);
        if (member) {
          await deleteSyncedEvent(member, evt.google_event_id);
        }
      }
      dispatch({ type: "REMOVE_EVENT", value: editingEvent.id });
    }
    setDialogOpen(false); setEditingEvent(null);
  }, [editingEvent, events, members, dispatch]);

  const handleCloseDialog = useCallback(() => { setDialogOpen(false); setEditingEvent(null); setEventForm(defaultEventForm()); }, []);

  // Sync
  const handleSync = useCallback(async () => {
    setSyncing(true); setSyncMessage("Syncing...");
    try {
      const results = await syncAllMembers(members, events, family.id, dispatch);
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
    setConnectingId(member.id);
    try {
      const result = await connectMemberCalendar(member.id);
      dispatch({ type: "UPDATE_MEMBER", value: { id: member.id, google_calendar_id: result.calendarId } });
    } catch (err) {
      console.warn("Connect failed:", err.message);
    }
    setConnectingId(null);
  }, [dispatch]);

  const handleDisconnectMember = useCallback((member) => {
    disconnectMemberCalendar(member.id);
    dispatch({ type: "UPDATE_MEMBER", value: { id: member.id, google_calendar_id: "" } });
  }, [dispatch]);

  const connectedCount = members.filter((m) => m.google_calendar_id).length;
  const syncTooltip = lastSyncTime ? `Last: ${lastSyncTime.toLocaleTimeString()}` : "Sync calendars";

  // Auto-sync: initial sync on load + background polling every 30s
  const syncingRef = useRef(false);
  const pollRef = useRef(null);

  // Silent sync (no UI feedback unless changes found)
  const silentSync = useCallback(async () => {
    if (syncingRef.current || connectedCount === 0) return;
    syncingRef.current = true;
    try {
      const results = await syncAllMembers(members, events, family.id, dispatch);
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

  useEffect(() => {
    if (connectedCount === 0 || members.length === 0) return;

    // Initial sync after 1.5s
    const initTimer = setTimeout(silentSync, 1500);

    // Poll every 30 seconds while page is visible
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
        silentSync(); // Sync immediately when tab becomes visible
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
  }, [connectedCount, members.length, silentSync]);

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
      background: darkMode ? "rgba(108,92,231,0.06)" : "linear-gradient(135deg, rgba(108,92,231,0.06), rgba(0,184,148,0.06))",
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

  return (
    <Box sx={{ flex: 1 }}>
      {/* Header - simplified (date now in HeaderBar) */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
          {/* Left: compact date nav */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton size="small" onClick={goPrev} sx={{ bgcolor: "action.hover", width: 32, height: 32 }}><Icon>chevron_left</Icon></IconButton>
            <IconButton size="small" onClick={goNext} sx={{ bgcolor: "action.hover", width: 32, height: 32 }}><Icon>chevron_right</Icon></IconButton>
            {!isToday && <Chip label="Today" size="small" onClick={goToday} sx={{ fontWeight: 600, cursor: "pointer", bgcolor: "#6C5CE7", color: "#fff", "&:hover": { bgcolor: "#5B4BC7" } }} />}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {syncMessage || (connectedCount > 0 ? `${connectedCount} calendar${connectedCount > 1 ? "s" : ""} connected` : "Tap avatars to connect calendars")}
            </Typography>
          </Box>

          {/* Right: view toggle + sync */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ bgcolor: "rgba(108,92,231,0.08)", borderRadius: "12px", p: "3px", display: "inline-flex" }}>
              <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)}
                sx={{ minHeight: 34,
                  "& .MuiTabs-indicator": { borderRadius: "9px", height: "100%", bgcolor: "#fff", boxShadow: "0 2px 8px rgba(108,92,231,0.15)" },
                  "& .MuiTab-root": { minHeight: 30, py: 0, px: 2.5, fontSize: "0.75rem", fontWeight: 700, zIndex: 1, color: "#8B8680", transition: "color 0.2s", "&.Mui-selected": { color: "#6C5CE7" } },
                }}
              >
                <Tab label="Day" />
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

      {/* Main content with sidebar */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden", gap: 2 }}>
        {/* Calendar content */}
        <Box sx={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          {/* Member strip */}
          <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, mb: 2.5, overflowX: "auto", pb: 0.5, px: 0.5 }}>
            {members.map((m) => {
              const connected = Boolean(m.google_calendar_id);
              return (
                <Tooltip key={m.id} title={connected ? `Connected — tap to disconnect` : "Tap to connect Google Calendar"} arrow>
                  <Box onClick={() => connected ? handleDisconnectMember(m) : handleConnectMember(m)}
                    sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", opacity: connectingId === m.id ? 0.5 : 1, minWidth: isSmall ? 54 : 68, transition: "opacity 0.2s" }}
                  >
                    <Box sx={{ position: "relative", mb: 0.5 }}>
                      <Avatar src={m.avatar_url || undefined}
                        sx={{ width: isSmall ? 44 : 52, height: isSmall ? 44 : 52, bgcolor: m.avatar_color, boxShadow: `0 4px 14px ${m.avatar_color}30`, border: connected ? `3px solid ${m.avatar_color}` : "3px solid transparent", transition: "border 0.2s" }}
                      >
                        <Icon sx={{ fontSize: "1.3rem !important", color: "#fff" }}>person</Icon>
                      </Avatar>
                      {connected && (
                        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", bgcolor: "success.main", border: "2px solid", borderColor: "background.paper", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon sx={{ fontSize: "0.5rem !important", color: "#fff" }}>check</Icon>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.65rem", lineHeight: 1.2, textAlign: "center" }}>
                      {m.name.split(" ")[0]}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* Day View */}
          {viewTab === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <DayTimeline date={currentDate} members={members} events={events} onEventClick={handleEventClick} onTimeClick={handleTimeClick} />
            </motion.div>
          )}

          {/* Month View */}
          {viewTab === 1 && (
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

        {/* Smart Sidebar */}
        <SmartSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            localStorage.setItem("famcal_sidebar_collapsed", String(next));
          }}
          notesWidget={notesWidget}
          countdownWidget={countdownWidget}
          todayChoresWidget={todayChoresWidget}
          tonightDinnerWidget={tonightDinnerWidget}
        />
      </Box>

      {/* FAB */}
      <Fab color="primary" onClick={() => { setEditingEvent(null); setEventForm(defaultEventForm(fmtDate(currentDate))); setDialogOpen(true); }}
        sx={{ position: "fixed", bottom: 76, right: 20, zIndex: 1200 }}
      >
        <Icon>add</Icon>
      </Fab>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h5" fontWeight="bold">{editingEvent ? "Edit Event" : "New Event"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small"><Icon>close</Icon></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
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
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Start Date" type="date" value={eventForm.startDate} onChange={(e) => handleFormChange("startDate", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
              {!eventForm.allDay && <TextField label="Start Time" type="time" value={eventForm.startTime} onChange={(e) => handleFormChange("startTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />}
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="End Date" type="date" value={eventForm.endDate} onChange={(e) => handleFormChange("endDate", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ min: eventForm.startDate }} />
              {!eventForm.allDay && <TextField label="End Time" type="time" value={eventForm.endTime} onChange={(e) => handleFormChange("endTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: editingEvent ? "space-between" : "flex-end" }}>
          {editingEvent && <Button onClick={handleDeleteEvent} color="error" variant="outlined" startIcon={<Icon>delete</Icon>}>Delete</Button>}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleCloseDialog} variant="outlined">Cancel</Button>
            <Button onClick={handleSaveEvent} variant="contained" disabled={!eventForm.title.trim()}>{editingEvent ? "Save" : "Add Event"}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FamilyCalendar;
