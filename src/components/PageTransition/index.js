import PropTypes from "prop-types";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";

const variants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const transition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={variants}
      transition={transition}
    >
      <Box sx={{ minHeight: "100vh", pb: { xs: 10, sm: 10 }, pt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 2.5, lg: 3 } }}>
        {children}
      </Box>
    </motion.div>
  );
}

PageTransition.propTypes = { children: PropTypes.node };
