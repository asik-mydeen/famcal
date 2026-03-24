import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { motion } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";

function GlassCard({
  children,
  sx,
  delay = 0,
  hover = true,
  ...props
}) {
  const { tokens } = useAppTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Box
        sx={{
          background: tokens.glass.bg,
          border: tokens.glass.border !== "none" ? `1px solid ${tokens.glass.border}` : "none",
          borderRadius: "20px",
          p: 2.5,
          boxShadow: tokens.glass.shadow,
          transition: "box-shadow 0.3s ease, transform 0.3s ease",
          ...(hover && {
            "&:hover": {
              boxShadow: tokens.glass.hoverShadow,
              transform: "translateY(-1px)",
            },
          }),
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    </motion.div>
  );
}

GlassCard.propTypes = {
  children: PropTypes.node,
  sx: PropTypes.object,
  delay: PropTypes.number,
  hover: PropTypes.bool,
};

export default GlassCard;
