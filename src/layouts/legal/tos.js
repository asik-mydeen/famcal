/* eslint-disable react/no-unescaped-entities, react/prop-types */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useThemeMode } from "context/ThemeContext";

const sections = [
  {
    title: "1. Acceptance of Terms",
    text: 'By using FamCal ("the Service") at famcal.site, you agree to these Terms. If you disagree, do not use the Service.',
  },
  {
    title: "2. Description of Service",
    text: `FamCal provides:
- Shared family calendar with Google Calendar sync
- Task and chore management with gamification
- Meal planning and grocery lists
- Photo frame slideshow via Google Photos
- Weather display
- Event countdowns and family notes
- AI-powered command bar`,
  },
  {
    title: "3. Account Registration",
    text: `To use FamCal, sign in with Google. By signing in you:
- Confirm you are 18+ or have parental consent
- Agree to provide accurate information
- Are responsible for your account security
- Are responsible for all activity under your account`,
  },
  {
    title: "4. Acceptable Use",
    text: `You agree NOT to:
- Use the Service unlawfully
- Attempt unauthorized access
- Interfere with the Service
- Upload malicious content
- Harass others
- Reverse engineer the Service`,
  },
  {
    title: "5. Google Services Integration",
    text: "FamCal integrates with Google Calendar, Photos, and Sign-In. Your use is subject to Google's Terms of Service and Privacy Policy. You can revoke access anytime via Google Account settings.",
  },
  {
    title: "6. User Content",
    text: "You own all content you create in FamCal. You grant us a limited license to store and display your content for providing the Service.",
  },
  {
    title: "7. Family Sharing",
    text: "All family members share access to the same data. The account owner has administrative control. You manage who accesses your family data.",
  },
  {
    title: "8. AI Features",
    text: "AI features use third-party services. AI responses may not be accurate. Review AI-created items before relying on them. We are not responsible for actions based on AI suggestions.",
  },
  {
    title: "9. Service Availability",
    text: "We do not guarantee uninterrupted service. The Service may be unavailable due to maintenance, technical issues, or third-party outages.",
  },
  {
    title: "10. Limitation of Liability",
    text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, FAMCAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES. Total liability shall not exceed $0 (the Service is free).",
  },
  {
    title: "11. Disclaimer",
    text: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.',
  },
  {
    title: "12. Changes to Terms",
    text: "We may modify these Terms. Continued use constitutes acceptance.",
  },
  {
    title: "13. Termination",
    text: "We may suspend or terminate access at any time. You may stop using the Service at any time.",
  },
  {
    title: "14. Contact Us",
    text: "Email: itsmeasik@gmail.com\nWebsite: https://famcal.site",
  },
];

export default function TermsOfService() {
  const { darkMode } = useThemeMode();
  return (
    <Box sx={{
      maxWidth: 800, mx: "auto", px: { xs: 3, md: 4 }, py: { xs: 4, md: 6 },
      minHeight: "100vh",
      background: darkMode ? "#0a0a1a" : "linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%)",
      color: darkMode ? "#fff" : "#1A1A1A",
    }}>
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 1 }}>
        Terms of Service
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 4 }}>
        Last updated: March 21, 2026
      </Typography>
      {sections.map((s) => (
        <Box key={s.title} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>{s.title}</Typography>
          <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.8, color: "text.secondary", whiteSpace: "pre-line" }}>
            {s.text}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
