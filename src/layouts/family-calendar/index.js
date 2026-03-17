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
import useMediaQuery from "@mui/material/useMediaQuery";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { motion, AnimatePresence } from "framer-motion";

import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { syncAllMembers } from "lib/googleCalendar";

// ── Helpers ──

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatTimeStr(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getMemberGradient(member) {
  if (!member) return "info";
  return MEMBER_COLORS.find((c) => c.value === member.avatar_color)?.gradient || "info";
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const VIEW_MAP = {
  0: "dayGridMonth",
  1: "timeGridWeek",
  2: "timeGridDay",
};

// ── Default event dialog state ──

function defaultEventForm(dateStr) {
  const today = dateStr || formatDateStr(new Date());
  return {
    title: "",
    member_id: "",
    startDate: today,
    startTime: "09:00",
    endDate: today,
    endTime: "10:00",
    allDay: false,
  };
}

// ── Main Component ──

function FamilyCalendar() {
  const [state, dispatch] = useFamilyController();
  const { family, members, events, selectedMembers } = state;

  const calendarRef = useRef(null);
  const isSmall = useMediaQuery("(max-width:599px)");
  const isMedium = useMediaQuery("(max-width:959px)");

  // View state
  const [viewTab, setViewTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(defaultEventForm());

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // ── Filtered events ──

  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        if (!evt.member_id) return true; // family-wide events always shown
        return selectedMembers.includes(evt.member_id);
      })
      .map((evt) => ({
        id: evt.id,
        title: evt.title,
        start: evt.start,
        end: evt.end,
        allDay: evt.allDay,
        className: `event-${evt.className || "info"}`,
        extendedProps: {
          member_id: evt.member_id,
          source: evt.source,
          google_event_id: evt.google_event_id,
          originalClassName: evt.className,
        },
      }));
  }, [events, selectedMembers]);

  // ── Calendar navigation sync ──

  const handleDatesSet = useCallback((dateInfo) => {
    setCurrentDate(dateInfo.view.currentStart);
  }, []);

  // ── View change ──

  const handleViewChange = useCallback((_, newValue) => {
    setViewTab(newValue);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(VIEW_MAP[newValue]);
    }
  }, []);

  // ── Date click → open add dialog ──

  const handleDateClick = useCallback((info) => {
    setEditingEvent(null);
    setEventForm({
      ...defaultEventForm(info.dateStr.split("T")[0]),
      startDate: info.dateStr.split("T")[0],
      endDate: info.dateStr.split("T")[0],
    });
    setDialogOpen(true);
  }, []);

  // ── Event click → open edit dialog ──

  const handleEventClick = useCallback(
    (info) => {
      const evt = events.find((e) => e.id === info.event.id);
      if (!evt) return;

      const startDt = new Date(evt.start);
      const endDt = evt.end ? new Date(evt.end) : startDt;

      setEditingEvent(evt);
      setEventForm({
        title: evt.title,
        member_id: evt.member_id || "",
        startDate: formatDateStr(startDt),
        startTime: evt.allDay ? "09:00" : formatTimeStr(startDt),
        endDate: formatDateStr(endDt),
        endTime: evt.allDay ? "10:00" : formatTimeStr(endDt),
        allDay: evt.allDay || false,
      });
      setDialogOpen(true);
    },
    [events]
  );

  // ── Form handlers ──

  const handleFormChange = useCallback((field, value) => {
    setEventForm((prev) => {
      const next = { ...prev, [field]: value };
      // Keep end date >= start date
      if (field === "startDate" && next.endDate < next.startDate) {
        next.endDate = next.startDate;
      }
      return next;
    });
  }, []);

  // ── Save event ──

  const handleSaveEvent = useCallback(() => {
    const { title, member_id, startDate, startTime, endDate, endTime, allDay } = eventForm;
    if (!title.trim()) return;

    const member = members.find((m) => m.id === member_id);
    const gradient = getMemberGradient(member);

    const start = allDay ? startDate : `${startDate}T${startTime}:00`;
    const end = allDay ? endDate : `${endDate}T${endTime}:00`;

    if (editingEvent) {
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
        },
      });
    } else {
      dispatch({
        type: "ADD_EVENT",
        value: {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          family_id: family.id,
          member_id: member_id || null,
          title: title.trim(),
          start,
          end,
          allDay,
          className: gradient,
          source: "manual",
        },
      });
    }

    setDialogOpen(false);
    setEditingEvent(null);
    setEventForm(defaultEventForm());
  }, [eventForm, editingEvent, members, family.id, dispatch]);

  // ── Delete event ──

  const handleDeleteEvent = useCallback(() => {
    if (editingEvent) {
      dispatch({ type: "REMOVE_EVENT", value: editingEvent.id });
    }
    setDialogOpen(false);
    setEditingEvent(null);
    setEventForm(defaultEventForm());
  }, [editingEvent, dispatch]);

  // ── Close dialog ──

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingEvent(null);
    setEventForm(defaultEventForm());
  }, []);

  // ── Google sync ──

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAllMembers(members, events, family.id, dispatch);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn("[gcal] Sync error:", err.message);
    }
    setSyncing(false);
  }, [members, events, family.id, dispatch]);

  // ── Toggle member visibility ──

  const handleToggleMember = useCallback(
    (memberId) => {
      dispatch({ type: "TOGGLE_MEMBER_VISIBILITY", value: memberId });
    },
    [dispatch]
  );

  const handleShowAll = useCallback(() => {
    dispatch({ type: "TOGGLE_MEMBER_VISIBILITY", value: "__reset__" });
  }, [dispatch]);

  // ── Derive month/year display ──

  const monthYearLabel = useMemo(() => {
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate]);

  const allSelected = selectedMembers.length === members.length;

  // ── Sync tooltip ──

  const syncTooltip = lastSyncTime
    ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
    : "Sync with Google Calendar";

  return (
    <Box>
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isSmall ? "column" : "row",
          alignItems: isSmall ? "flex-start" : "center",
          justifyContent: "space-between",
          mb: 3,
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h4" fontWeight="bold">
            Calendar
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {monthYearLabel}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={syncTooltip} arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  <Icon
                    sx={{
                      animation: syncing ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  >
                    sync
                  </Icon>
                }
                onClick={handleSync}
                disabled={syncing}
                sx={{ textTransform: "none", borderRadius: "12px" }}
              >
                {syncing ? "Syncing..." : "Sync"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Member Filter Chips ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label="All"
          size="small"
          onClick={handleShowAll}
          sx={{
            fontWeight: 600,
            borderRadius: "19px",
            border: "1px solid",
            borderColor: allSelected ? "primary.main" : "divider",
            bgcolor: allSelected ? "rgba(124,58,237,0.2)" : "transparent",
            color: allSelected ? "primary.light" : "text.secondary",
            "&:hover": { bgcolor: "rgba(124,58,237,0.15)" },
          }}
        />
        {members.map((member) => {
          const isActive = selectedMembers.includes(member.id);
          const color = member.avatar_color || "#7c3aed";
          return (
            <Chip
              key={member.id}
              label={member.name}
              size="small"
              onClick={() => handleToggleMember(member.id)}
              sx={{
                fontWeight: 600,
                borderRadius: "19px",
                border: "1.5px solid",
                borderColor: isActive ? color : "divider",
                bgcolor: isActive ? `${color}33` : "transparent",
                color: isActive ? color : "text.secondary",
                opacity: isActive ? 1 : 0.6,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: `${color}22`,
                  opacity: 1,
                },
              }}
            />
          );
        })}
      </Box>

      {/* ── View Switcher ── */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Tabs
          value={viewTab}
          onChange={handleViewChange}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0.5,
              px: 2,
              fontSize: "0.8125rem",
              fontWeight: 600,
              textTransform: "none",
            },
          }}
        >
          <Tab label="Month" />
          <Tab label="Week" />
          <Tab label="Day" />
        </Tabs>
      </Box>

      {/* ── Calendar Card ── */}
      <Card
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{ overflow: "hidden" }}
      >
        <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 }, "&:last-child": { pb: { xs: 1, sm: 2, md: 3 } } }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            events={filteredEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height={isSmall ? "60vh" : "70vh"}
            dayMaxEvents={isSmall ? 2 : 4}
            nowIndicator
            editable={false}
            selectable={false}
            eventDisplay="block"
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
          />
        </CardContent>
      </Card>

      {/* ── FAB ── */}
      <Fab
        color="primary"
        aria-label="Add event"
        onClick={() => {
          setEditingEvent(null);
          setEventForm(defaultEventForm());
          setDialogOpen(true);
        }}
        sx={{
          position: "fixed",
          bottom: 76,
          right: 20,
          zIndex: 1200,
        }}
      >
        <Icon>add</Icon>
      </Fab>

      {/* ── Add/Edit Event Dialog ── */}
      <AnimatePresence>
        {dialogOpen && (
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmall}
            PaperProps={{
              component: motion.div,
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.95 },
              transition: { duration: 0.2 },
            }}
          >
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h5" fontWeight="bold">
                  {editingEvent ? "Edit Event" : "New Event"}
                </Typography>
                <IconButton onClick={handleCloseDialog} size="small">
                  <Icon>close</Icon>
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
                {/* Title */}
                <TextField
                  label="Event Title"
                  value={eventForm.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  fullWidth
                  autoFocus
                  placeholder="What's happening?"
                />

                {/* Member Assignment */}
                <TextField
                  label="Assign to Member"
                  value={eventForm.member_id}
                  onChange={(e) => handleFormChange("member_id", e.target.value)}
                  select
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Family Event (everyone)</em>
                  </MenuItem>
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: m.avatar_color,
                          }}
                        />
                        {m.name}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                {/* All Day Toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={eventForm.allDay}
                      onChange={(e) => handleFormChange("allDay", e.target.checked)}
                    />
                  }
                  label="All Day"
                />

                {/* Start Date & Time */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => handleFormChange("startDate", e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  {!eventForm.allDay && (
                    <TextField
                      label="Start Time"
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => handleFormChange("startTime", e.target.value)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>

                {/* End Date & Time */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="End Date"
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => handleFormChange("endDate", e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: eventForm.startDate }}
                  />
                  {!eventForm.allDay && (
                    <TextField
                      label="End Time"
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => handleFormChange("endTime", e.target.value)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, justifyContent: editingEvent ? "space-between" : "flex-end" }}>
              {editingEvent && (
                <Button
                  onClick={handleDeleteEvent}
                  color="error"
                  variant="outlined"
                  startIcon={<Icon>delete</Icon>}
                  sx={{ textTransform: "none", borderRadius: "12px" }}
                >
                  Delete
                </Button>
              )}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  onClick={handleCloseDialog}
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: "12px" }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEvent}
                  variant="contained"
                  disabled={!eventForm.title.trim()}
                  sx={{ textTransform: "none", borderRadius: "12px" }}
                >
                  {editingEvent ? "Save Changes" : "Add Event"}
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>
    </Box>
  );
}

export default FamilyCalendar;
