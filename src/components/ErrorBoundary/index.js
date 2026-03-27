import { Component } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          }}
        >
          <Box
            sx={{
              maxWidth: 440,
              width: "100%",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.6)",
              borderRadius: "20px",
              p: { xs: 3, sm: 4 },
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
                boxShadow: "0 8px 24px #6C5CE744",
              }}
            >
              <Icon sx={{ color: "#fff", fontSize: "1.8rem !important" }}>
                sentiment_dissatisfied
              </Icon>
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#1a1a1a",
                mb: 1,
                fontSize: "1.3rem",
              }}
            >
              Something went wrong
            </Typography>

            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#8B8680",
                mb: 3,
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred. You can try again or reload the page
              to get back on track.
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center" }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: 600,
                  borderColor: "divider",
                  color: "#8B8680",
                  touchAction: "manipulation",
                }}
              >
                <Icon sx={{ fontSize: "1.2rem !important", mr: 0.5 }}>
                  refresh
                </Icon>
                Try Again
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReload}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #5b4bc4 0%, #9775fa 100%)",
                  },
                  touchAction: "manipulation",
                }}
              >
                <Icon sx={{ fontSize: "1.2rem !important", mr: 0.5 }}>
                  restart_alt
                </Icon>
                Reload Page
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
