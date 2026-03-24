import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { motion } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";

function SuggestionPill({ icon, label, onClick }) {
  const { darkMode } = useThemeMode();

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      style={{ display: "inline-block" }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: "19px",
          background: darkMode ? "rgba(255,255,255,0.08)" : "#ffffff",
          border: darkMode
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(0,0,0,0.08)",
          boxShadow: darkMode
            ? "0 2px 8px rgba(0,0,0,0.2)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          touchAction: "manipulation",
          userSelect: "none",
          "&:hover": {
            background: darkMode ? "rgba(255,255,255,0.12)" : "#f9f9f9",
            boxShadow: darkMode
              ? "0 4px 16px rgba(0,0,0,0.3)"
              : "0 4px 16px rgba(0,0,0,0.1)",
            borderColor: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
          },
          "&:active": {
            transform: "scale(0.97)",
          },
        }}
      >
        <Icon
          sx={{
            fontSize: "1.1rem",
            color: darkMode ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
          }}
        >
          {icon}
        </Icon>
        <Typography
          sx={{
            fontSize: "0.86rem",
            fontWeight: 500,
            color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
      </Box>
    </motion.div>
  );
}

SuggestionPill.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default SuggestionPill;
