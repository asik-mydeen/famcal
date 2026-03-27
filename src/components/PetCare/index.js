import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import SlidePanel from "components/SlidePanel";
import { useFamilyController } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

const SPECIES_OPTIONS = [
  { key: "dog", label: "Dog", icon: "pets" },
  { key: "cat", label: "Cat", icon: "pets" },
  { key: "fish", label: "Fish", icon: "set_meal" },
  { key: "bird", label: "Bird", icon: "flutter_dash" },
  { key: "hamster", label: "Hamster", icon: "cruelty_free" },
  { key: "rabbit", label: "Rabbit", icon: "cruelty_free" },
  { key: "other", label: "Other", icon: "pets" },
];

const CARE_TYPES = [
  { key: "feed", label: "Feed", icon: "restaurant", color: "#f59e0b" },
  { key: "walk", label: "Walk", icon: "directions_walk", color: "#22c55e" },
  { key: "medicine", label: "Medicine", icon: "medication", color: "#ef4444" },
  { key: "groom", label: "Groom", icon: "content_cut", color: "#8b5cf6" },
  { key: "play", label: "Play", icon: "sports_tennis", color: "#3b82f6" },
  { key: "vet", label: "Vet", icon: "local_hospital", color: "#ec4899" },
];

function getSpeciesIcon(species) {
  return SPECIES_OPTIONS.find((s) => s.key === species)?.icon || "pets";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function PetCare() {
  const [state, dispatch] = useFamilyController();
  const { members, pets, petCareLogs } = state;
  const { tokens, gradient, darkMode } = useAppTheme();

  const [addPetOpen, setAddPetOpen] = useState(false);
  const [editPet, setEditPet] = useState(null);
  const [petForm, setPetForm] = useState({
    name: "",
    species: "dog",
    breed: "",
    birth_date: "",
    notes: "",
  });

  const resetPetForm = useCallback(() => {
    setPetForm({ name: "", species: "dog", breed: "", birth_date: "", notes: "" });
    setEditPet(null);
  }, []);

  const openAddPet = useCallback(() => {
    resetPetForm();
    setAddPetOpen(true);
  }, [resetPetForm]);

  const openEditPet = useCallback((pet) => {
    setEditPet(pet);
    setPetForm({
      name: pet.name,
      species: pet.species || "dog",
      breed: pet.breed || "",
      birth_date: pet.birth_date || "",
      notes: pet.notes || "",
    });
    setAddPetOpen(true);
  }, []);

  const handleSavePet = useCallback(() => {
    if (!petForm.name.trim()) return;
    if (editPet) {
      dispatch({
        type: "UPDATE_PET",
        value: { id: editPet.id, ...petForm },
      });
    } else {
      dispatch({
        type: "ADD_PET",
        value: { id: `pet-${Date.now()}`, ...petForm },
      });
    }
    setAddPetOpen(false);
    resetPetForm();
  }, [petForm, editPet, dispatch, resetPetForm]);

  const handleRemovePet = useCallback((petId) => {
    if (!window.confirm("Remove this pet? This cannot be undone.")) return;
    dispatch({ type: "REMOVE_PET", value: petId });
  }, [dispatch]);

  const handleLogCare = useCallback((petId, careType, memberId) => {
    dispatch({
      type: "ADD_PET_CARE_LOG",
      value: {
        id: `pcl-${Date.now()}`,
        pet_id: petId,
        member_id: memberId || null,
        care_type: careType,
        notes: "",
        created_at: new Date().toISOString(),
      },
    });
  }, [dispatch]);

  // Compute "last done" for each pet+care_type
  const lastCareMap = useMemo(() => {
    const map = {};
    (petCareLogs || []).forEach((log) => {
      const key = `${log.pet_id}:${log.care_type}`;
      if (!map[key] || new Date(log.created_at) > new Date(map[key].created_at)) {
        map[key] = log;
      }
    });
    return map;
  }, [petCareLogs]);

  // Today's care log
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = useMemo(() => {
    return (petCareLogs || []).filter((log) => log.created_at && log.created_at.startsWith(todayStr));
  }, [petCareLogs, todayStr]);

  const getMemberName = useCallback((memberId) => {
    const m = members.find((mem) => mem.id === memberId);
    return m ? m.name : "Someone";
  }, [members]);

  const getPetAge = useCallback((birthDate) => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - bd.getFullYear();
    if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) years--;
    if (years < 1) {
      const months = (now.getFullYear() - bd.getFullYear()) * 12 + now.getMonth() - bd.getMonth();
      return `${months}mo`;
    }
    return `${years}yr${years !== 1 ? "s" : ""}`;
  }, []);

  // Select first member as default for quick log
  const defaultMember = members[0];

  if (pets.length === 0 && !addPetOpen) {
    return (
      <Box sx={{ mt: 3 }}>
        <GlassCard>
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Icon sx={{ fontSize: "2.5rem !important", color: "text.disabled", mb: 1, display: "block", mx: "auto" }}>pets</Icon>
            <Typography fontWeight={600} fontSize="1rem" sx={{ mb: 0.5 }}>No Pets Yet</Typography>
            <Typography fontSize="0.85rem" color="text.secondary" sx={{ mb: 2 }}>
              Add your family pets to track feeding, walks, and more
            </Typography>
            <Button
              variant="contained"
              startIcon={<Icon sx={{ fontSize: "1.2rem !important" }}>add</Icon>}
              onClick={openAddPet}
              sx={{
                borderRadius: "12px", textTransform: "none", fontWeight: 600,
                background: gradient(tokens.accent.main, tokens.accent.light),
                "&:hover": { background: gradient(tokens.accent.dark, tokens.accent.light) },
                touchAction: "manipulation",
              }}
            >
              Add a Pet
            </Button>
          </Box>
        </GlassCard>
        <AddPetPanel
          open={addPetOpen}
          onClose={() => { setAddPetOpen(false); resetPetForm(); }}
          form={petForm}
          setForm={setPetForm}
          onSave={handleSavePet}
          editPet={editPet}
          tokens={tokens}
          gradient={gradient}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Section Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography fontWeight={700} fontSize="1.1rem" sx={{ color: "text.primary" }}>
          <Icon sx={{ fontSize: "1.2rem !important", verticalAlign: "middle", mr: 0.5, color: tokens.accent.main }}>pets</Icon>
          Pet Care
        </Typography>
        <Button
          size="small"
          startIcon={<Icon sx={{ fontSize: "1rem !important" }}>add</Icon>}
          onClick={openAddPet}
          sx={{ textTransform: "none", color: tokens.accent.main, fontWeight: 600, touchAction: "manipulation" }}
        >
          Add Pet
        </Button>
      </Box>

      {/* Pet Cards */}
      <AnimatePresence mode="popLayout">
        {pets.map((pet, idx) => {
          const age = getPetAge(pet.birth_date);
          return (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
            >
              <GlassCard sx={{ mb: 2 }}>
                {/* Pet header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: "14px",
                    background: alpha(tokens.accent.main, 0.1),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon sx={{ fontSize: "1.5rem !important", color: tokens.accent.main }}>{getSpeciesIcon(pet.species)}</Icon>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} fontSize="1rem">{pet.name}</Typography>
                    <Typography fontSize="0.75rem" color="text.secondary">
                      {SPECIES_OPTIONS.find((s) => s.key === pet.species)?.label || pet.species}
                      {pet.breed ? ` - ${pet.breed}` : ""}
                      {age ? ` - ${age}` : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.25 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditPet(pet)} sx={{ color: "text.secondary", "&:hover": { color: tokens.accent.main } }}>
                        <Icon sx={{ fontSize: "1rem !important" }}>edit</Icon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => handleRemovePet(pet.id)} sx={{ color: "text.secondary", "&:hover": { color: "#ef4444" } }}>
                        <Icon sx={{ fontSize: "1rem !important" }}>delete</Icon>
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Quick-log buttons */}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                  {CARE_TYPES.map((care) => {
                    const lastLog = lastCareMap[`${pet.id}:${care.key}`];
                    const lastText = lastLog ? timeAgo(lastLog.created_at) : null;
                    return (
                      <Tooltip key={care.key} title={lastText ? `Last: ${lastText}${lastLog.member_id ? ` by ${getMemberName(lastLog.member_id)}` : ""}` : `Log ${care.label}`}>
                        <Button
                          size="small"
                          onClick={() => handleLogCare(pet.id, care.key, defaultMember?.id)}
                          sx={{
                            borderRadius: "12px",
                            textTransform: "none",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.5,
                            minWidth: 0,
                            background: alpha(care.color, 0.1),
                            color: care.color,
                            border: `1px solid ${alpha(care.color, 0.2)}`,
                            touchAction: "manipulation",
                            "&:hover": { background: alpha(care.color, 0.2) },
                            "&:active": { transform: "scale(0.97)" },
                          }}
                        >
                          <Icon sx={{ fontSize: "0.9rem !important", mr: 0.5 }}>{care.icon}</Icon>
                          {care.label}
                        </Button>
                      </Tooltip>
                    );
                  })}
                </Box>

                {/* Last done summary */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {CARE_TYPES.slice(0, 3).map((care) => {
                    const lastLog = lastCareMap[`${pet.id}:${care.key}`];
                    if (!lastLog) return null;
                    return (
                      <Chip
                        key={care.key}
                        size="small"
                        label={`${care.label} ${timeAgo(lastLog.created_at)}${lastLog.member_id ? ` by ${getMemberName(lastLog.member_id)}` : ""}`}
                        sx={{
                          height: 22, fontSize: "0.65rem", fontWeight: 600,
                          bgcolor: alpha(care.color, 0.08),
                          color: darkMode ? "#fff" : "#1a1a1a",
                          border: `1px solid ${alpha(care.color, 0.15)}`,
                        }}
                      />
                    );
                  })}
                </Box>
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Today's care log */}
      {todayLogs.length > 0 && (
        <GlassCard sx={{ mt: 1 }}>
          <Typography fontWeight={600} fontSize="0.85rem" sx={{ mb: 1, color: "text.primary" }}>
            Today&apos;s Care Log
          </Typography>
          {todayLogs.slice(0, 10).map((log, idx) => {
            const pet = pets.find((p) => p.id === log.pet_id);
            const care = CARE_TYPES.find((c) => c.key === log.care_type);
            if (!pet || !care) return null;
            const time = new Date(log.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
            return (
              <Box key={log.id || idx} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Icon sx={{ fontSize: "0.9rem !important", color: care.color }}>{care.icon}</Icon>
                <Typography fontSize="0.78rem" color="text.secondary">
                  {log.member_id ? getMemberName(log.member_id) : "Someone"} {care.label.toLowerCase()}ed {pet.name} at {time}
                </Typography>
              </Box>
            );
          })}
        </GlassCard>
      )}

      {/* Add/Edit Pet Panel */}
      <AddPetPanel
        open={addPetOpen}
        onClose={() => { setAddPetOpen(false); resetPetForm(); }}
        form={petForm}
        setForm={setPetForm}
        onSave={handleSavePet}
        editPet={editPet}
        tokens={tokens}
        gradient={gradient}
      />
    </Box>
  );
}

/* eslint-disable react/prop-types */
function AddPetPanel({ open, onClose, form, setForm, onSave, editPet, tokens, gradient }) {
  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={editPet ? "Edit Pet" : "Add Pet"}
      icon="pets"
      width={480}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ color: "text.secondary", borderColor: "divider", textTransform: "none", borderRadius: "12px" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!form.name.trim()}
            sx={{
              background: gradient(tokens.accent.main, tokens.accent.light),
              color: "#fff", textTransform: "none", borderRadius: "12px", fontWeight: 600,
              "&:hover": { background: gradient(tokens.accent.dark, tokens.accent.light) },
            }}
          >
            {editPet ? "Save Changes" : "Add Pet"}
          </Button>
        </>
      }
    >
      {/* Name */}
      <Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
          Name
        </Typography>
        <TextField
          fullWidth
          placeholder="e.g. Max, Whiskers"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          size="small"
        />
      </Box>

      {/* Species */}
      <Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
          Species
        </Typography>
        <TextField
          select
          fullWidth
          value={form.species}
          onChange={(e) => setForm({ ...form, species: e.target.value })}
          size="small"
        >
          {SPECIES_OPTIONS.map((s) => (
            <MenuItem key={s.key} value={s.key}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Icon sx={{ fontSize: "1.2rem !important" }}>{s.icon}</Icon>
                {s.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Breed */}
      <Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
          Breed (optional)
        </Typography>
        <TextField
          fullWidth
          placeholder="e.g. Golden Retriever"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          size="small"
        />
      </Box>

      {/* Birth Date */}
      <Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
          Birth Date (optional)
        </Typography>
        <TextField
          fullWidth
          type="date"
          value={form.birth_date}
          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Notes */}
      <Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
          Notes (optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Any notes about your pet..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          size="small"
        />
      </Box>
    </SlidePanel>
  );
}

export default PetCare;
