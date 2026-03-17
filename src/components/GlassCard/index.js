import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";

function GlassCard({
  children,
  sx,
  delay = 0,
  hover = true,
  ...props
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Box
        sx={{
          background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
          border: dark ? "1px solid rgba(255,255,255,0.08)" : "none",
          borderRadius: "20px",
          p: 2.5,
          boxShadow: dark
            ? "0 8px 32px rgba(0,0,0,0.25)"
            : "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)",
          transition: "box-shadow 0.3s ease, transform 0.3s ease",
          ...(hover && {
            "&:hover": {
              boxShadow: dark
                ? "0 12px 40px rgba(0,0,0,0.3)"
                : "0 4px 16px rgba(0,0,0,0.1)",
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
