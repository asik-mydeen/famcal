import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Fab from "@mui/material/Fab";
import Divider from "@mui/material/Divider";
import useMediaQuery from "@mui/material/useMediaQuery";
import GlassCard from "components/GlassCard";
import SlidePanel from "components/SlidePanel";
import PageShell from "components/PageShell";
import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";
import { getTokens } from "theme/tokens";
import { alpha } from "theme/helpers";

const LEVEL_TITLES = [
  "",
  "Beginner",
  "Novice",
  "Learner",
  "Rising Star",
  "Achiever",
  "Expert",
  "Master",
  "Champion",
  "Legend",
  "Supreme",
];

const REWARD_ICONS = [
  "devices", "cake", "movie", "bedtime", "icecream", "auto_stories",
  "sports_esports", "star", "directions_car", "tablet", "family_restroom",
  "restaurant", "local_movies", "hotel", "delivery_dining", "spa",
  "cleaning_services", "local_laundry_service", "redeem", "shopping_bag",
  "park", "music_note", "palette", "pets", "bed", "countertops",
];

const staticTokens = getTokens("light");

const RANK_COLORS = {
  1: staticTokens.level.gold,
  2: staticTokens.level.silver,
  3: staticTokens.level.bronze,
};

function getLevelTitle(level) {
  if (level <= 0) return LEVEL_TITLES[1];
  if (level >= LEVEL_TITLES.length) return LEVEL_TITLES[LEVEL_TITLES.length - 1];
  return LEVEL_TITLES[level];
}

function getLevel(points) {
  return Math.floor(points / 100) + 1;
}

function Rewards() {
  const [state, dispatch] = useFamilyController();
  const { members, rewards, tasks } = state;
  const { tokens, alpha: alphaFn, gradient, darkMode } = useAppTheme();

  const [claimDialog, setClaimDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [selectedMember, setSelectedMember] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [newReward, setNewReward] = useState({
    title: "",
    description: "",
    points_cost: 50,
    icon: "star",
  });

  const isSmall = useMediaQuery("(max-width:599px)");


  // Computed data
  const totalPoints = useMemo(() => members.reduce((sum, m) => sum + m.points, 0), [members]);
  const tasksDone = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const bestStreak = useMemo(
    () => (members.length > 0 ? Math.max(...members.map((m) => m.streak_days)) : 0),
    [members]
  );
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => b.points - a.points),
    [members]
  );

  const getRankDisplay = (index) => {
    if (index === 0) return "\uD83E\uDD47";
    if (index === 1) return "\uD83E\uDD48";
    if (index === 2) return "\uD83E\uDD49";
    return `${index + 1}`;
  };

  const handleOpenClaim = (reward) => {
    setSelectedReward(reward);
    setSelectedMember("");
    setClaimDialog(true);
  };

  const handleClaim = () => {
    if (!selectedReward || !selectedMember) return;
    const member = members.find((m) => m.id === selectedMember);
    if (member && member.points >= selectedReward.points_cost) {
      dispatch({
        type: "CLAIM_REWARD",
        value: { rewardId: selectedReward.id, memberId: selectedMember },
      });
    }
    setClaimDialog(false);
    setSelectedReward(null);
    setSelectedMember("");
  };

  const handleAddReward = () => {
    if (!newReward.title) return;
    dispatch({
      type: "ADD_REWARD",
      value: {
        ...newReward,
        id: `reward-${Date.now()}`,
        family_id: state.family.id,
      },
    });
    setAddDialog(false);
    setNewReward({ title: "", description: "", points_cost: 50, icon: "star" });
  };

  const claimMember = selectedMember ? members.find((m) => m.id === selectedMember) : null;
  const canClaim =
    claimMember && selectedReward && claimMember.points >= selectedReward.points_cost;
  const remainingPoints =
    claimMember && selectedReward ? claimMember.points - selectedReward.points_cost : 0;

  return (
    <PageShell>
      {/* ── Stats Banner ── */}
      <GlassCard
        delay={0}
        sx={{
          mb: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${alpha(tokens.accent.main, 0.12)} 0%, ${alpha(tokens.accent.light, 0.06)} 50%, ${alpha(tokens.priority.medium, 0.08)} 100%)`,
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
        <Grid
          container
          spacing={2}
          alignItems="center"
          sx={{ position: "relative", zIndex: 1 }}
        >
          {/* Total Points */}
          <Grid item xs={4} textAlign="center">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 0.5 }}>
              <Icon sx={{ fontSize: "1.4rem !important", color: tokens.priority.medium }}>stars</Icon>
            </Box>
            <Typography
              variant={isSmall ? "h4" : "h3"}
              sx={{ fontWeight: 800, color: tokens.priority.medium, lineHeight: 1.2 }}
            >
              {totalPoints.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: isSmall ? "0.6rem" : "0.75rem" }}>
              Total Points
            </Typography>
          </Grid>

          {/* Tasks Done */}
          <Grid item xs={4} textAlign="center">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 0.5 }}>
              <Icon sx={{ fontSize: "1.4rem !important", color: tokens.priority.low }}>task_alt</Icon>
            </Box>
            <Typography
              variant={isSmall ? "h4" : "h3"}
              sx={{ fontWeight: 800, color: tokens.priority.low, lineHeight: 1.2 }}
            >
              {tasksDone}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: isSmall ? "0.6rem" : "0.75rem" }}>
              Tasks Done
            </Typography>
          </Grid>

          {/* Best Streak */}
          <Grid item xs={4} textAlign="center">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 0.5 }}>
              <Icon sx={{ fontSize: "1.4rem !important", color: tokens.priority.high }}>
                local_fire_department
              </Icon>
            </Box>
            <Typography
              variant={isSmall ? "h4" : "h3"}
              sx={{ fontWeight: 800, color: tokens.priority.high, lineHeight: 1.2 }}
            >
              {bestStreak}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: isSmall ? "0.6rem" : "0.75rem" }}>
              Best Streak
            </Typography>
          </Grid>
        </Grid>
      </GlassCard>

      {/* ── Main Content: Leaderboard + Rewards Store ── */}
      <Grid container spacing={3}>
        {/* ── Leaderboard ── */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Icon sx={{ fontSize: "1.5rem !important", color: tokens.level.gold }}>emoji_events</Icon>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
              Leaderboard
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {sortedMembers.map((member, index) => {
              const level = getLevel(member.points);
              const progressValue = member.points % 100;
              const isFirst = index === 0;

              return (
                <GlassCard
                  key={member.id}
                  delay={0.08 * (index + 1)}
                  hover
                  glow={isFirst ? tokens.level.gold : undefined}
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    ...(isFirst && {
                      border: `1px solid ${alpha(tokens.level.gold, 0.25)}`,
                      background: alpha(tokens.level.gold, 0.06),
                    }),
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 2 } }}>
                    {/* Rank */}
                    <Box
                      sx={{
                        width: 36,
                        textAlign: "center",
                        flexShrink: 0,
                        fontSize: index < 3 ? "1.5rem" : "1rem",
                        fontWeight: 700,
                        color: RANK_COLORS[index + 1] || "text.secondary",
                      }}
                    >
                      {getRankDisplay(index)}
                    </Box>

                    {/* Avatar */}
                    {member.avatar_url ? (
                      <Avatar
                        src={member.avatar_url}
                        sx={{
                          width: isSmall ? 42 : 52,
                          height: isSmall ? 42 : 52,
                          border: `2px solid ${member.avatar_color}`,
                          boxShadow: `0 4px 14px ${member.avatar_color}44`,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <Avatar
                        sx={{
                          width: isSmall ? 42 : 52,
                          height: isSmall ? 42 : 52,
                          bgcolor: member.avatar_color,
                          fontSize: isSmall ? "1.3rem" : "1.6rem",
                          boxShadow: `0 4px 14px ${member.avatar_color}44`,
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ fontSize: "1.4rem !important", color: "#fff" }}>person</Icon>
                      </Avatar>
                    )}

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            fontSize: isSmall ? "0.85rem" : "0.95rem",
                          }}
                        >
                          {member.name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Icon sx={{ fontSize: "0.9rem !important", color: tokens.priority.medium }}>star</Icon>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: tokens.priority.medium,
                              fontSize: isSmall ? "0.8rem" : "0.9rem",
                            }}
                          >
                            {member.points.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.75,
                        }}
                      >
                        <Chip
                          label={`Lv.${level} ${getLevelTitle(level)}`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            bgcolor: `${member.avatar_color}22`,
                            color: member.avatar_color,
                            border: `1px solid ${member.avatar_color}33`,
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Icon sx={{ fontSize: "0.8rem !important", color: tokens.priority.high }}>
                            local_fire_department
                          </Icon>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: tokens.priority.high,
                              fontSize: "0.7rem",
                            }}
                          >
                            {member.streak_days}d
                          </Typography>
                        </Box>
                      </Box>

                      {/* Level progress bar */}
                      <LinearProgress
                        variant="determinate"
                        value={progressValue}
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          bgcolor: `${member.avatar_color}15`,
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor: member.avatar_color,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </GlassCard>
              );
            })}
          </Box>
        </Grid>

        {/* ── Rewards Store ── */}
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Icon sx={{ fontSize: "1.5rem !important", color: tokens.accent.main }}>storefront</Icon>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
                Rewards Store
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<Icon>add</Icon>}
              onClick={() => setAddDialog(true)}
              sx={{
                bgcolor: tokens.accent.main,
                color: "#fff",
                fontWeight: 600,
                borderRadius: "12px",
                textTransform: "none",
                px: 2,
                "&:hover": { bgcolor: tokens.accent.dark },
              }}
            >
              {isSmall ? "" : "Add"}
            </Button>
          </Box>

          <Grid container spacing={2}>
            {rewards.map((reward, index) => (
              <Grid item xs={12} sm={6} md={4} key={reward.id}>
                <GlassCard
                  delay={0.06 * (index + 1)}
                  hover
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    "&:active": { transform: "scale(0.97)" },
                  }}
                  onClick={() => handleOpenClaim(reward)}
                >
                  {/* Large emoji icon */}
                  <Box
                    sx={{
                      width: 56, height: 56, borderRadius: "16px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: "primary.main", opacity: 0.9,
                      mb: 1.5,
                    }}
                  >
                    <Icon sx={{ fontSize: "1.8rem !important", color: "#fff" }}>{reward.icon}</Icon>
                  </Box>

                  {/* Title */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      fontSize: "0.95rem",
                      mb: 0.5,
                    }}
                  >
                    {reward.title}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.78rem",
                      mb: 1.5,
                      minHeight: "1.2em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {reward.description}
                  </Typography>

                  {/* Points cost badge */}
                  <Chip
                    label={`\u2B50 ${reward.points_cost}`}
                    size="small"
                    sx={{
                      bgcolor: alpha(tokens.priority.medium, 0.15),
                      color: tokens.priority.medium,
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      border: `1px solid ${alpha(tokens.priority.medium, 0.25)}`,
                      mb: 1.5,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />

                  {/* Claim button */}
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenClaim(reward);
                    }}
                    sx={{
                      bgcolor: tokens.priority.low,
                      color: "text.primary",
                      fontWeight: 600,
                      borderRadius: "10px",
                      textTransform: "none",
                      fontSize: "0.8rem",
                      "&:hover": { bgcolor: tokens.priority.low, filter: "brightness(0.9)" },
                    }}
                  >
                    Claim
                  </Button>
                </GlassCard>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      {/* ── Claim Reward SlidePanel ── */}
      <SlidePanel
        open={claimDialog}
        onClose={() => setClaimDialog(false)}
        title="Claim Reward"
        icon="redeem"
        width={420}
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => setClaimDialog(false)}
              sx={{
                borderColor: "divider",
                color: "text.secondary",
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "text.disabled",
                  bgcolor: "action.hover",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!canClaim}
              onClick={handleClaim}
              sx={{
                bgcolor: tokens.priority.low,
                color: "#fff",
                fontWeight: 600,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { bgcolor: tokens.priority.low, filter: "brightness(0.9)" },
                "&.Mui-disabled": {
                  bgcolor: "action.hover",
                  color: "text.disabled",
                },
              }}
            >
              Confirm Claim
            </Button>
          </>
        }
      >
        {selectedReward && (
          <>
            <Box sx={{ textAlign: "center" }}>
              {/* Reward icon */}
              <Box sx={{ width: 64, height: 64, borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", mx: "auto", mb: 1 }}>
                <Icon sx={{ fontSize: "2rem !important", color: "#fff" }}>{selectedReward.icon}</Icon>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
                {selectedReward.title}
              </Typography>
              <Chip
                label={`\u2B50 ${selectedReward.points_cost} points`}
                sx={{
                  bgcolor: alpha(tokens.priority.medium, 0.15),
                  color: tokens.priority.medium,
                  fontWeight: 700,
                  border: `1px solid ${alpha(tokens.priority.medium, 0.25)}`,
                }}
              />
            </Box>

            {/* Member select */}
            <TextField
              select
              fullWidth
              label="Select Family Member"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  color: "text.primary",
                  "& fieldset": { borderColor: "divider" },
                  "&:hover fieldset": { borderColor: "text.disabled" },
                  "&.Mui-focused fieldset": { borderColor: tokens.accent.main },
                },
                "& .MuiInputLabel-root": { color: "text.secondary" },
                "& .MuiSelect-icon": { color: "text.secondary" },
              }}
            >
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id} disabled={m.points < selectedReward.points_cost}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: m.avatar_color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon sx={{ fontSize: "0.9rem !important", color: "#fff" }}>person</Icon></Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: m.points >= selectedReward.points_cost ? tokens.priority.low : tokens.priority.high,
                      }}
                    >
                      {m.points} pts
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* Remaining points preview */}
            {claimMember && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: canClaim ? alpha(tokens.priority.low, 0.08) : alpha(tokens.priority.high, 0.08),
                  border: `1px solid ${canClaim ? alpha(tokens.priority.low, 0.2) : alpha(tokens.priority.high, 0.2)}`,
                }}
              >
                {canClaim ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {claimMember.name} will have{" "}
                    <Typography
                      component="span"
                      sx={{ fontWeight: 700, color: tokens.priority.low }}
                    >
                      {remainingPoints} points
                    </Typography>{" "}
                    remaining
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: tokens.priority.high, fontWeight: 600 }}>
                    Not enough points ({claimMember.points} / {selectedReward.points_cost} needed)
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </SlidePanel>

      {/* ── Add Reward SlidePanel ── */}
      <SlidePanel
        open={addDialog}
        onClose={() => setAddDialog(false)}
        title="Add New Reward"
        icon="add"
        width={480}
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => setAddDialog(false)}
              sx={{
                borderColor: "divider",
                color: "text.secondary",
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "text.disabled",
                  bgcolor: "action.hover",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!newReward.title}
              onClick={handleAddReward}
              sx={{
                bgcolor: tokens.accent.main,
                color: "#fff",
                fontWeight: 600,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { bgcolor: tokens.accent.dark },
                "&.Mui-disabled": {
                  bgcolor: "action.hover",
                  color: "text.disabled",
                },
              }}
            >
              Add Reward
            </Button>
          </>
        }
      >
        {/* Emoji picker */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              color: "text.secondary",
              letterSpacing: "0.05em",
              mb: 1,
              display: "block",
            }}
          >
            Choose an Icon
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {REWARD_ICONS.map((iconName) => (
              <Box
                key={iconName}
                onClick={() => setNewReward({ ...newReward, icon: iconName })}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border:
                    newReward.icon === iconName
                      ? `2px solid ${tokens.accent.main}`
                      : "1px solid rgba(0,0,0,0.06)",
                  bgcolor:
                    newReward.icon === iconName
                      ? alpha(tokens.accent.main, 0.15)
                      : "rgba(0,0,0,0.02)",
                  transition: "all 0.2s",
                  touchAction: "manipulation",
                  "&:hover": {
                    transform: "scale(1.1)",
                    borderColor: "divider",
                  },
                }}
              >
                <Icon sx={{ fontSize: "1.3rem !important", color: newReward.icon === iconName ? "primary.main" : "text.secondary" }}>{iconName}</Icon>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Title */}
        <TextField
          fullWidth
          label="Reward Title"
          placeholder="e.g. Extra Screen Time"
          value={newReward.title}
          onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              color: "text.primary",
              "& fieldset": { borderColor: "divider" },
              "&:hover fieldset": { borderColor: "text.disabled" },
              "&.Mui-focused fieldset": { borderColor: tokens.accent.main },
            },
            "& .MuiInputLabel-root": { color: "text.secondary" },
          }}
        />

        {/* Description */}
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Description"
          placeholder="What does this reward include?"
          value={newReward.description}
          onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              color: "text.primary",
              "& fieldset": { borderColor: "divider" },
              "&:hover fieldset": { borderColor: "text.disabled" },
              "&.Mui-focused fieldset": { borderColor: tokens.accent.main },
            },
            "& .MuiInputLabel-root": { color: "text.secondary" },
          }}
        />

        {/* Points Cost */}
        <TextField
          fullWidth
          type="number"
          label="Points Cost"
          value={newReward.points_cost}
          onChange={(e) =>
            setNewReward({ ...newReward, points_cost: parseInt(e.target.value, 10) || 0 })
          }
          inputProps={{ min: 1 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              color: "text.primary",
              "& fieldset": { borderColor: "divider" },
              "&:hover fieldset": { borderColor: "text.disabled" },
              "&.Mui-focused fieldset": { borderColor: tokens.accent.main },
            },
            "& .MuiInputLabel-root": { color: "text.secondary" },
          }}
        />
      </SlidePanel>
    </PageShell>
  );
}

export default Rewards;
