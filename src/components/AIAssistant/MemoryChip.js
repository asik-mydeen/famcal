import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import { motion } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";

function MemoryChip({ memory, onDismiss }) {
  const { darkMode } = useThemeMode();

  const truncatedContent =
    memory.content.length > 40 ? `${memory.content.slice(0, 40)}...` : memory.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: "19px",
          background: darkMode ? "rgba(108, 92, 231, 0.25)" : "rgba(108, 92, 231, 0.15)",
          border: darkMode
            ? "1px solid rgba(108, 92, 231, 0.3)"
            : "1px solid rgba(108, 92, 231, 0.2)",
          position: "relative",
          transition: "all 0.2s ease",
          "&:hover": {
            background: darkMode ? "rgba(108, 92, 231, 0.35)" : "rgba(108, 92, 231, 0.25)",
            "& .dismiss-btn": {
              opacity: 1,
            },
          },
        }}
      >
        <Icon sx={{ fontSize: "1rem", color: "#6C5CE7" }}>psychology</Icon>
        <Typography
          sx={{
            fontSize: "0.8rem",
            fontWeight: 500,
            color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
            lineHeight: 1.3,
            maxWidth: "200px",
          }}
        >
          {truncatedContent}
        </Typography>
        <IconButton
          className="dismiss-btn"
          size="small"
          onClick={() => onDismiss(memory.id)}
          sx={{
            padding: "2px",
            opacity: 0,
            transition: "opacity 0.2s ease",
            color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
            "&:hover": {
              background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            },
          }}
        >
          <Icon sx={{ fontSize: "0.9rem" }}>close</Icon>
        </IconButton>
      </Box>
    </motion.div>
  );
}

MemoryChip.propTypes = {
  memory: PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    category: PropTypes.string,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default MemoryChip;
