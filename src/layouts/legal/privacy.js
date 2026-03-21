/* eslint-disable react/no-unescaped-entities, react/prop-types */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useThemeMode } from "context/ThemeContext";

const sections = [
  {
    title: "1. Introduction",
    text: 'FamCal ("we," "our," or "us") is a family calendar and task management application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application at famcal.site and related services (collectively, the "Service").',
  },
  {
    title: "2. Information We Collect",
    text: `Account Information: When you sign in with Google, we receive your name, email address, and profile picture from your Google account.

Family Data: Information you voluntarily provide, including family member names, birth dates, calendar events, tasks, meal plans, shopping lists, notes, and rewards. This data is stored securely in our database (Supabase).

Google Calendar Data: If you connect Google Calendar, we access your calendar events to display and sync them. We request the minimum scope needed and only access calendars you explicitly connect.

Google Photos Data: If you connect Google Photos, we access your albums and photos in read-only mode to display in the slideshow. We do not download your photos to our servers.

Weather Data: If you provide a location, we send it to OpenWeatherMap to retrieve weather. We do not share your location with other third parties.`,
  },
  {
    title: "3. How We Use Your Information",
    text: `We use your information to:
- Provide and maintain the FamCal service
- Sync calendar events between FamCal and Google Calendar
- Display your Google Photos in the photo frame
- Display weather information
- Enable family collaboration features
- Improve and develop new features`,
  },
  {
    title: "4. Data Storage",
    text: `Your data is stored securely in Supabase with encryption at rest and in transit. Google authentication tokens are stored securely and used only to access authorized services.

We do NOT store your Google Photos on our servers. Photos are displayed directly from Google's servers.

We do NOT store your Google account password. Authentication is handled by Google's OAuth 2.0.`,
  },
  {
    title: "5. Data Sharing",
    text: `We do NOT sell, trade, or rent your personal information. We share data only with:
- Service Providers: Supabase (database), Vercel (hosting), Google (auth, calendar, photos), OpenWeatherMap (weather)
- Legal Requirements: If required by law
- Family Members: Data in your family account is shared with other family members`,
  },
  {
    title: "6. Google API Services",
    text: `FamCal's use of Google API data adheres to the Google API Services User Data Policy, including Limited Use requirements.

- We only request minimum scopes necessary
- We do not use Google data for advertising
- We do not transfer Google data to unauthorized third parties
- We do not use Google data for unrelated purposes`,
  },
  {
    title: "7. Data Retention and Deletion",
    text: `We retain data while your account is active. You can delete family data through Settings. To delete your account, contact itsmeasik@gmail.com and we will remove all data within 30 days.

You can revoke FamCal's access at myaccount.google.com/permissions.`,
  },
  {
    title: "8. Security",
    text: `We implement reasonable security measures:
- HTTPS encryption for all data in transit
- Encrypted database storage via Supabase
- OAuth 2.0 authentication (no passwords stored)
- Row Level Security (RLS) to isolate family data

No method of transmission is 100% secure.`,
  },
  {
    title: "9. Children's Privacy",
    text: "FamCal is designed for family use and may include information about children added by parents or guardians. We do not knowingly collect information directly from children under 13.",
  },
  {
    title: "10. Changes to This Policy",
    text: 'We may update this Privacy Policy. Changes will be posted here with an updated "Last updated" date.',
  },
  {
    title: "11. Contact Us",
    text: "Email: itsmeasik@gmail.com\nWebsite: https://famcal.site",
  },
];

export default function PrivacyPolicy() {
  const { darkMode } = useThemeMode();
  return (
    <Box sx={{
      maxWidth: 800, mx: "auto", px: { xs: 3, md: 4 }, py: { xs: 4, md: 6 },
      minHeight: "100vh",
      background: darkMode ? "#0a0a1a" : "linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%)",
      color: darkMode ? "#fff" : "#1A1A1A",
    }}>
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 1 }}>
        Privacy Policy
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
