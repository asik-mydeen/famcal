import PropTypes from "prop-types";
import Box from "@mui/material/Box";

function PageShell({ children, maxWidth, flush }) {
  return (
    <Box
      sx={{
        ...(!flush && {
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
        }),
        ...(maxWidth && { maxWidth, mx: "auto" }),
      }}
    >
      {children}
    </Box>
  );
}

PageShell.propTypes = {
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  flush: PropTypes.bool,
};

export default PageShell;
