# FamCal Environment Variables

## Core (required)

| Variable | Description |
|---|---|
| `REACT_APP_SUPABASE_URL` | Supabase project URL (used by frontend and API) |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key — bypasses RLS, server-side only |

## AI / Voice (optional)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI key for chat, TTS, and Whisper transcription |
| `NOVA_API_KEY` | Amazon Nova real-time voice (optional) |

## Google Calendar (optional)

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Email Digest — S2.2 (required for daily digest)

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username / from address (e.g. `yourname@gmail.com`) |
| `SMTP_PASS` | SMTP password or app password |
| `CRON_SECRET` | Secret token used to authenticate cron calls to `POST /api/send-digest` |
| `SUPABASE_SERVICE_KEY` | Service role key for server-side Supabase access (bypasses RLS) — shared with Core above |

> Gmail users: create an App Password at https://myaccount.google.com/apppasswords (requires 2FA enabled).
> The cron container calls `POST /api/send-digest` every day at 07:00 with `Authorization: Bearer <CRON_SECRET>`.

## Server

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `3001`) |
| `ALLOWED_ORIGINS` | Comma-separated extra CORS origins (optional) |
