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
import { syncAllMembers, connectMemberCalendar, disconnectMemberCalendar } from "lib/googleCalendar";

// ── Helpers ──

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getMemberGradient(member) {
  if (!member) return "info";
  return MEMBER_COLORS.find((c) => c.value === member.avatar_color)?.gradient || "info";
}

const DAY_START = 6; // 6 AM
const DAY_END = 22; // 10 PM
const HOUR_HEIGHT = 60; // px per hour

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function defaultEventForm(dateStr) {
  const today = dateStr || fmtDate(new Date());
  return { title: "", member_id: "", startDate: today, startTime: "09:00", endDate: today, endTime: "10:00", allDay: false };
}

// ── Day Timeline Component (Skylight-style) ──

DayTimeline.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  members: PropTypes.array.isRequired,
  events: PropTypes.array.isRequired,
  onEventClick: PropTypes.func.isRequired,
  onTimeClick: PropTypes.func.isRequired,
};

function DayTimeline({ date, members, events, onEventClick, onTimeClick }) {
  const isSmall = useMediaQuery("(max-width:599px)");
  const dateStr = fmtDate(date);
  const now = new Date();
  const isToday = fmtDate(now) === dateStr;
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Events for this day, grouped by member
  const memberEvents = useMemo(() => {
    const map = {};
    members.forEach((m) => { map[m.id] = []; });
    map.__family__ = []; // family-wide events

    events.forEach((evt) => {
      const evtDate = (evt.start || "").split("T")[0];
      if (evt.allDay && evtDate <= dateStr && (evt.end || evtDate) >= dateStr) {
        const bucket = evt.member_id && map[evt.member_id] ? evt.member_id : "__family__";
        map[bucket].push(evt);
      } else if (evtDate === dateStr) {
        const bucket = evt.member_id && map[evt.member_id] ? evt.member_id : "__family__";
        map[bucket].push(evt);
      }
    });
    return map;
  }, [members, events, dateStr]);

  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);

  const totalHeight = (DAY_END - DAY_START) * HOUR_HEIGHT;

  return (
    <Card sx={{ overflow: "hidden" }}>
      {/* All-day events banner */}
      {(() => {
        const allDayEvts = events.filter((e) => e.allDay && (e.start || "").split("T")[0] <= dateStr && ((e.end || e.start || "").split("T")[0]) >= dateStr);
        if (allDayEvts.length === 0) return null;
        return (
          <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: "1px solid", borderColor: "divider" }}>
            {allDayEvts.map((evt) => {
              const member = members.find((m) => m.id === evt.member_id);
              return (
                <Chip
                  key={evt.id}
                  label={evt.title}
                  size="small"
                  onClick={() => onEventClick(evt)}
                  sx={{
                    bgcolor: member ? `${member.avatar_color}20` : "action.hover",
                    color: member ? member.avatar_color : "text.primary",
                    fontWeight: 600, fontSize: "0.75rem", cursor: "pointer",
                    border: "1px solid", borderColor: member ? `${member.avatar_color}40` : "divider",
                  }}
                />
              );
            })}
          </Box>
        );
      })()}

      {/* Column headers: member avatars */}
      <Box sx={{ display: "flex", borderBottom: "1px solid", borderColor: "divider" }}>
        {/* Time label spacer */}
        <Box sx={{ width: isSmall ? 40 : 56, flexShrink: 0 }} />
        {/* Member columns */}
        {members.map((m) => (
          <Box key={m.id} sx={{ flex: 1, py: 1.5, textAlign: "center", minWidth: 0 }}>
            <Avatar
              src={m.avatar_url || undefined}
              sx={{
                width: isSmall ? 36 : 44, height: isSmall ? 36 : 44,
                bgcolor: m.avatar_color, mx: "auto", mb: 0.5,
                fontSize: isSmall ? "0.8rem" : "1rem",
                boxShadow: `0 2px 8px ${m.avatar_color}40`,
              }}
            >
              <Icon sx={{ fontSize: "1.2rem !important", color: "#fff" }}>person</Icon>
            </Avatar>
            <Typography variant="caption" fontWeight={600} sx={{ color: "text.primary", display: "block", fontSize: isSmall ? "0.6rem" : "0.7rem" }}>
              {m.name}
            </Typography>
            {m.google_calendar_id ? (
              <Icon sx={{ fontSize: "0.7rem !important", color: "success.main" }}>check_circle</Icon>
            ) : (
              <Icon sx={{ fontSize: "0.7rem !important", color: "text.disabled" }}>link_off</Icon>
            )}
          </Box>
        ))}
      </Box>

      {/* Timeline grid */}
      <Box sx={{ position: "relative", height: totalHeight, overflow: "auto" }}>
        {/* Hour lines */}
        {hours.map((h) => (
          <Box
            key={h}
            sx={{
              position: "absolute",
              top: (h - DAY_START) * HOUR_HEIGHT,
              left: 0, right: 0, height: HOUR_HEIGHT,
              display: "flex",
              borderBottom: "1px solid", borderColor: "divider",
            }}
          >
            {/* Time label */}
            <Box sx={{
              width: isSmall ? 40 : 56, flexShrink: 0, pr: 1,
              display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
              pt: 0.5,
            }}>
              <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem", fontWeight: 500 }}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </Typography>
            </Box>
            {/* Member column backgrounds */}
            {members.map((m) => (
              <Box
                key={m.id}
                onClick={() => onTimeClick(dateStr, `${String(h).padStart(2, "0")}:00`, m.id)}
                sx={{
                  flex: 1, borderLeft: "1px solid", borderColor: "divider",
                  cursor: "pointer", transition: "background 0.15s",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              />
            ))}
          </Box>
        ))}

        {/* Now indicator */}
        {isToday && currentHour >= DAY_START && currentHour <= DAY_END && (
          <Box sx={{
            position: "absolute",
            top: (currentHour - DAY_START) * HOUR_HEIGHT,
            left: isSmall ? 40 : 56, right: 0, height: 2,
            bgcolor: "error.main", zIndex: 5,
            "&::before": {
              content: '""', position: "absolute", left: -4, top: -4,
              width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main",
            },
          }} />
        )}

        {/* Events */}
        {members.map((m, mIdx) => {
          const colLeft = isSmall ? 40 : 56;
          const colWidth = `calc((100% - ${colLeft}px) / ${members.length})`;
          const mEvents = (memberEvents[m.id] || []).filter((e) => !e.allDay);

          return mEvents.map((evt) => {
            const startDt = new Date(evt.start);
            const endDt = evt.end ? new Date(evt.end) : new Date(startDt.getTime() + 3600000);
            const startH = startDt.getHours() + startDt.getMinutes() / 60;
            const endH = endDt.getHours() + endDt.getMinutes() / 60;
            const top = Math.max(0, (startH - DAY_START)) * HOUR_HEIGHT;
            const height = Math.max(HOUR_HEIGHT * 0.4, (endH - startH) * HOUR_HEIGHT);

            return (
              <Box
                key={evt.id}
                onClick={() => onEventClick(evt)}
                sx={{
                  position: "absolute",
                  top, height,
                  left: `calc(${colLeft}px + ${colWidth} * ${mIdx} + 2px)`,
                  width: `calc(${colWidth} - 4px)`,
                  bgcolor: `${m.avatar_color}CC`,
                  color: "#fff",
                  borderRadius: "8px",
                  px: 1, py: 0.5,
                  cursor: "pointer",
                  overflow: "hidden",
                  zIndex: 3,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  boxShadow: `0 2px 8px ${m.avatar_color}40`,
                  transition: "transform 0.15s, box-shadow 0.15s",
                  "&:hover": {
                    transform: "scale(1.02)",
                    boxShadow: `0 4px 16px ${m.avatar_color}60`,
                  },
                }}
              >
                <Box sx={{ fontWeight: 700, fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {evt.title}
                </Box>
                {height > 30 && (
                  <Box sx={{ fontSize: "0.6rem", opacity: 0.85 }}>
                    {fmtTime(startDt)} - {fmtTime(endDt)}
                  </Box>
                )}
              </Box>
            );
          });
        })}

        {/* Family-wide events (span full width) */}
        {(memberEvents.__family__ || []).filter((e) => !e.allDay).map((evt) => {
          const startDt = new Date(evt.start);
          const endDt = evt.end ? new Date(evt.end) : new Date(startDt.getTime() + 3600000);
          const startH = startDt.getHours() + startDt.getMinutes() / 60;
          const endH = endDt.getHours() + endDt.getMinutes() / 60;
          const top = Math.max(0, (startH - DAY_START)) * HOUR_HEIGHT;
          const height = Math.max(HOUR_HEIGHT * 0.4, (endH - startH) * HOUR_HEIGHT);
          const colLeft = isSmall ? 40 : 56;

          return (
            <Box
              key={evt.id}
              onClick={() => onEventClick(evt)}
              sx={{
                position: "absolute", top, height,
                left: `calc(${colLeft}px + 2px)`, right: 2,
                bgcolor: "rgba(78,205,196,0.2)", border: "1px solid rgba(78,205,196,0.4)",
                color: "text.primary", borderRadius: "8px",
                px: 1, py: 0.5, cursor: "pointer", overflow: "hidden", zIndex: 2,
                fontSize: "0.7rem", fontWeight: 600,
              }}
            >
              {evt.title}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

// ── Main Component ──

function FamilyCalendar() {
  const [state, dispatch] = useFamilyController();
  const { family, members, events } = state;
  const calendarRef = useRef(null);
  const isSmall = useMediaQuery("(max-width:599px)");

  // View: 0 = Day (Skylight), 1 = Month (FullCalendar)
  const [viewTab, setViewTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(defaultEventForm());

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  // ── Date navigation ──
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const dateLabel = `${DAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}`;
  const isToday = fmtDate(new Date()) === fmtDate(currentDate);

  // ── FullCalendar filtered events ──
  const fcEvents = useMemo(() => {
    return events.map((evt) => ({
      id: evt.id, title: evt.title, start: evt.start, end: evt.end, allDay: evt.allDay,
      className: `event-${evt.className || "info"}`,
      extendedProps: { member_id: evt.member_id, source: evt.source, google_event_id: evt.google_event_id, originalClassName: evt.className },
    }));
  }, [events]);

  // ── Event handlers ──
  const handleEventClick = useCallback((evt) => {
    const startDt = new Date(evt.start);
    const endDt = evt.end ? new Date(evt.end) : startDt;
    setEditingEvent(evt);
    setEventForm({
      title: evt.title, member_id: evt.member_id || "",
      startDate: fmtDate(startDt), startTime: evt.allDay ? "09:00" : fmtTime(startDt),
      endDate: fmtDate(endDt), endTime: evt.allDay ? "10:00" : fmtTime(endDt),
      allDay: evt.allDay || false,
    });
    setDialogOpen(true);
  }, []);

  const handleFcEventClick = useCallback((info) => {
    const evt = events.find((e) => e.id === info.event.id);
    if (evt) handleEventClick(evt);
  }, [events, handleEventClick]);

  const handleTimeClick = useCallback((dateStr, time, memberId) => {
    const [h] = time.split(":").map(Number);
    const endH = String(h + 1).padStart(2, "0");
    setEditingEvent(null);
    setEventForm({ title: "", member_id: memberId || "", startDate: dateStr, startTime: time, endDate: dateStr, endTime: `${endH}:00`, allDay: false });
    setDialogOpen(true);
  }, []);

  const handleFcDateClick = useCallback((info) => {
    const dateStr = info.dateStr.split("T")[0];
    setEditingEvent(null);
    setEventForm(defaultEventForm(dateStr));
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
      dispatch({ type: "UPDATE_EVENT", value: { id: editingEvent.id, title: title.trim(), member_id: member_id || null, start, end, allDay, className: gradient } });
    } else {
      dispatch({ type: "ADD_EVENT", value: { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, family_id: family.id, member_id: member_id || null, title: title.trim(), start, end, allDay, className: gradient, source: "manual" } });
    }
    setDialogOpen(false);
    setEditingEvent(null);
  }, [eventForm, editingEvent, members, family.id, dispatch]);

  const handleDeleteEvent = useCallback(() => {
    if (editingEvent) dispatch({ type: "REMOVE_EVENT", value: editingEvent.id });
    setDialogOpen(false);
    setEditingEvent(null);
  }, [editingEvent, dispatch]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingEvent(null);
    setEventForm(defaultEventForm());
  }, []);

  // ── Google sync ──
  const [syncMessage, setSyncMessage] = useState("");

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const results = await syncAllMembers(members, events, family.id, dispatch);
      setLastSyncTime(new Date());
      // Check for errors
      const errors = Object.entries(results).filter(([, r]) => r.error);
      const success = Object.entries(results).filter(([, r]) => !r.error);
      if (errors.length > 0 && success.length === 0) {
        const names = errors.map(([id]) => members.find((m) => m.id === id)?.name || "Unknown").join(", ");
        setSyncMessage(`${names} need to reconnect — tap their avatar`);
      } else if (errors.length > 0) {
        setSyncMessage(`Synced ${success.length}, ${errors.length} need reconnect`);
      } else if (success.length > 0) {
        const total = success.reduce((s, [, r]) => s + r.pulled + r.pushed, 0);
        setSyncMessage(total > 0 ? `Synced ${total} events` : "All up to date");
      }
      setTimeout(() => setSyncMessage(""), 5000);
    } catch (err) {
      console.warn("[gcal] Sync error:", err.message);
      setSyncMessage("Sync failed");
      setTimeout(() => setSyncMessage(""), 5000);
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

  const syncTooltip = lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : "Sync with Google Calendar";
  const connectedCount = members.filter((m) => m.google_calendar_id).length;

  return (
    <Box>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Calendar</Typography>
            <Typography variant="body2" color="text.secondary">
              {syncMessage || (connectedCount > 0 ? `${connectedCount} calendar${connectedCount > 1 ? "s" : ""} connected` : "Tap member avatars below to connect")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title={syncTooltip} arrow>
              <span>
                <Button
                  variant="outlined" size="small"
                  startIcon={<Icon sx={{ animation: syncing ? "spin 1s linear infinite" : "none", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } } }}>sync</Icon>}
                  onClick={handleSync} disabled={syncing || connectedCount === 0}
                >
                  {syncing ? "Syncing..." : "Sync"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </motion.div>

      {/* ── Date nav + View toggle ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={goPrev}><Icon>chevron_left</Icon></IconButton>
          <IconButton size="small" onClick={goNext}><Icon>chevron_right</Icon></IconButton>
          {!isToday && (
            <Button size="small" variant="outlined" onClick={goToday} sx={{ ml: 0.5 }}>Today</Button>
          )}
          <Typography variant={isSmall ? "body1" : "h6"} fontWeight={700} sx={{ ml: 1 }}>
            {viewTab === 0 ? dateLabel : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </Typography>
        </Box>
        <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5, px: 2, fontSize: "0.8rem" } }}>
          <Tab label="Day" />
          <Tab label="Month" />
        </Tabs>
      </Box>

      {/* ── Member connect strip ── */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 2, overflowX: "auto", pb: 0.5 }}>
        {members.map((m) => (
          <Tooltip key={m.id} title={m.google_calendar_id ? `Connected: ${m.google_calendar_id}` : "Click to connect Google Calendar"} arrow>
            <Box
              onClick={() => m.google_calendar_id ? handleDisconnectMember(m) : handleConnectMember(m)}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                cursor: "pointer", opacity: connectingId === m.id ? 0.5 : 1,
                minWidth: isSmall ? 56 : 64,
              }}
            >
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={m.avatar_url || undefined}
                  sx={{ width: isSmall ? 40 : 48, height: isSmall ? 40 : 48, bgcolor: m.avatar_color, boxShadow: `0 2px 8px ${m.avatar_color}40` }}
                >
                  <Icon sx={{ fontSize: "1.2rem !important", color: "#fff" }}>person</Icon>
                </Avatar>
                <Box sx={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 16, height: 16, borderRadius: "50%",
                  bgcolor: m.google_calendar_id ? "success.main" : "text.disabled",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid", borderColor: "background.paper",
                }}>
                  <Icon sx={{ fontSize: "0.55rem !important", color: "#fff" }}>
                    {m.google_calendar_id ? "check" : "link"}
                  </Icon>
                </Box>
              </Box>
              <Typography variant="caption" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.65rem", textAlign: "center", lineHeight: 1.2 }}>
                {m.name}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>

      {/* ── Day View (Skylight-style) ── */}
      {viewTab === 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DayTimeline
            date={currentDate}
            members={members}
            events={events}
            onEventClick={handleEventClick}
            onTimeClick={handleTimeClick}
          />
        </motion.div>
      )}

      {/* ── Month View (FullCalendar) ── */}
      {viewTab === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card sx={{ overflow: "hidden" }}>
            <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 }, "&:last-child": { pb: { xs: 1, sm: 2, md: 3 } } }}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                events={fcEvents}
                dateClick={handleFcDateClick}
                eventClick={handleFcEventClick}
                height={isSmall ? "60vh" : "70vh"}
                dayMaxEvents={isSmall ? 2 : 4}
                nowIndicator editable={false} selectable={false} eventDisplay="block"
                eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        onClick={() => { setEditingEvent(null); setEventForm(defaultEventForm(fmtDate(currentDate))); setDialogOpen(true); }}
        sx={{ position: "fixed", bottom: 76, right: 20, zIndex: 1200 }}
      >
        <Icon>add</Icon>
      </Fab>

      {/* ── Event Dialog ── */}
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
            <TextField label="Assign to Member" value={eventForm.member_id} onChange={(e) => handleFormChange("member_id", e.target.value)} select fullWidth>
              <MenuItem value=""><em>Family Event (everyone)</em></MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: m.avatar_color }} />
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
            <Button onClick={handleSaveEvent} variant="contained" disabled={!eventForm.title.trim()}>
              {editingEvent ? "Save" : "Add Event"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FamilyCalendar;
