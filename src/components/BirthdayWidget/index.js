import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

/**
 * Calculate days until next birthday for a member.
 * Returns { name, daysUntil, avatarColor, isBirthdayToday }.
 */
function getNextBirthday(member) {
  if (!member.birth_date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bd = new Date(member.birth_date);
  const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  thisYearBd.setHours(0, 0, 0, 0);

  let targetBd = thisYearBd;
  if (thisYearBd < today) {
    targetBd = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
    targetBd.setHours(0, 0, 0, 0);
  }

  const daysUntil = Math.round((targetBd - today) / 86400000);

  return {
    name: member.name,
    daysUntil,
    avatarColor: member.avatar_color || "#6C5CE7",
    isBirthdayToday: daysUntil === 0,
  };
}

function BirthdayWidget({ members = [] }) {
  const { tokens, darkMode } = useAppTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const upcomingBirthdays = useMemo(() => {
    return members
      .map(getNextBirthday)
      .filter(Boolean)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [members]);

  if (upcomingBirthdays.length === 0) return null;

  const nearest = upcomingBirthdays[0];
  const isToday = nearest.isBirthdayToday;
  const pillColor = isToday ? "#22c55e" : tokens.accent.main;

  const handleClick = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      >
        <Box
          onClick={handleClick}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            borderRadius: "20px",
            background: alpha(pillColor, darkMode ? 0.2 : 0.1),
            border: `1px solid ${alpha(pillColor, darkMode ? 0.3 : 0.2)}`,
            cursor: "pointer",
            touchAction: "manipulation",
            transition: "all 0.2s ease",
            "&:hover": {
              background: alpha(pillColor, darkMode ? 0.25 : 0.15),
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          {isToday ? (
            <motion.span
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              style={{ fontSize: "0.9rem", lineHeight: 1 }}
            >
              {"\uD83C\uDF89"}
            </motion.span>
          ) : (
            <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{"\uD83C\uDF82"}</span>
          )}
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            {isToday
              ? `Happy Birthday ${nearest.name}!`
              : `${nearest.name} in ${nearest.daysUntil}d`}
          </Typography>
        </Box>
      </motion.div>

      {/* Popover with all upcoming birthdays */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: "14px",
              bgcolor: tokens.glass.solidBg,
              border: `1px solid ${tokens.glass.divider}`,
              boxShadow: darkMode
                ? "0 8px 32px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(0,0,0,0.12)",
              p: 2,
              minWidth: 220,
              maxWidth: 300,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "text.secondary",
            mb: 1.5,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Upcoming Birthdays
        </Typography>

        <AnimatePresence>
          {upcomingBirthdays.map((bd, idx) => (
            <motion.div
              key={bd.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 0.75,
                  px: 1,
                  mb: 0.5,
                  borderRadius: "8px",
                  background: alpha(bd.avatarColor, darkMode ? 0.12 : 0.06),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: bd.avatarColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {bd.name?.[0] || "?"}
                  </Box>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
                    {bd.name}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: bd.isBirthdayToday ? "#22c55e" : tokens.accent.light,
                  }}
                >
                  {bd.isBirthdayToday ? "Today!" : `${bd.daysUntil}d`}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
      </Popover>
    </>
  );
}

BirthdayWidget.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      birth_date: PropTypes.string,
      avatar_color: PropTypes.string,
    })
  ),
};

export default BirthdayWidget;
