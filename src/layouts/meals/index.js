import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PageTransition from "components/PageTransition";

export default function Meals() {
  return (
    <PageTransition>
      <Box p={3} sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h4" fontWeight={700}>Meals</Typography>
        <Typography color="text.secondary" mt={1}>Coming soon...</Typography>
      </Box>
    </PageTransition>
  );
}
