/**
 * Google Calendar API integration using Google Identity Services (GIS).
 *
 * Flow:
 *  1. User sets Google OAuth Client ID in Settings
 *  2. Per family member, user clicks "Connect Calendar"
 *  3. GIS opens consent popup → returns access_token (1 hr)
 *  4. We fetch/push events via Calendar REST API
 *  5. On token expiry, GIS silently re-requests if user consented before
 */

const SCOPES = "https://www.googleapis.com/auth/calendar";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// ── Client ID management ──
// Client ID comes from environment variable, NOT from user input
export function getGoogleClientId() {
  return process.env.REACT_APP_GOOGLE_CLIENT_ID || localStorage.getItem("famcal_google_client_id") || "";
}

// Keep setGoogleClientId for backward compat but it's no longer needed in UI
export function setGoogleClientId(clientId) {
  localStorage.setItem("famcal_google_client_id", clientId);
}

// ── Token management (per member, in memory + localStorage) ──

const tokenCache = {};

function getCachedToken(memberId) {
  if (tokenCache[memberId] && tokenCache[memberId].expiry > Date.now()) {
    return tokenCache[memberId].accessToken;
  }
  // Try localStorage
  const stored = localStorage.getItem(`famcal_gtoken_${memberId}`);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.expiry > Date.now()) {
      tokenCache[memberId] = parsed;
      return parsed.accessToken;
    }
    localStorage.removeItem(`famcal_gtoken_${memberId}`);
  }
  return null;
}

function setCachedToken(memberId, accessToken, expiresIn) {
  const entry = { accessToken, expiry: Date.now() + expiresIn * 1000 - 60000 }; // 1 min buffer
  tokenCache[memberId] = entry;
  localStorage.setItem(`famcal_gtoken_${memberId}`, JSON.stringify(entry));
}

export function clearCachedToken(memberId) {
  delete tokenCache[memberId];
  localStorage.removeItem(`famcal_gtoken_${memberId}`);
}

/**
 * Check if a member has a valid (non-expired) Google Calendar token.
 * UI should use this to show real "connected" vs "needs reconnect" status.
 */
export function hasValidToken(memberId) {
  return getCachedToken(memberId) !== null;
}

// ── OAuth: connect a member to Google Calendar ──

// Request token for sync — uses GIS silent consent to auto-refresh expired tokens.
// Google access tokens last 1 hour. When expired, GIS `prompt: ""` silently issues
// a new token if the user previously consented (no popup, no user interaction).
// This effectively gives "refresh token" behavior on the client side.
//
// silentOnly=true: tries cache → silent GIS refresh → reject (no popup ever)
// silentOnly=false: tries cache → silent GIS refresh → interactive popup as last resort
export function requestAccessToken(memberId, loginHint, silentOnly = false) {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) return reject(new Error("Google Client ID not configured."));

    if (!window.google?.accounts?.oauth2) {
      return reject(new Error("Google Identity Services not loaded."));
    }

    // Check cache first
    const cached = getCachedToken(memberId);
    if (cached) return resolve(cached);

    // silentOnly=true: NEVER open GIS popup. Cache-only.
    // Used by all background operations (sync, push, auto-refresh).
    if (silentOnly) {
      return reject(new Error("Token expired — reconnect calendar"));
    }

    // silentOnly=false: User initiated — try GIS (may show popup)
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        hint: loginHint || undefined,
        callback: (resp) => {
          if (resp.error) {
            console.warn("[gcal] Token request failed for", loginHint, ":", resp.error);
            return reject(new Error(resp.error_description || resp.error));
          }
          setCachedToken(memberId, resp.access_token, resp.expires_in);
          console.log("[gcal] Token obtained for", loginHint);
          resolve(resp.access_token);
        },
        error_callback: (err) => {
          console.warn("[gcal] Token client error:", err);
          reject(new Error("Google Calendar access failed. Try reconnecting."));
        },
      });

      // prompt: "" tries silent first. If user already consented, no popup.
      tokenClient.requestAccessToken({ prompt: "", login_hint: loginHint || "" });
    } catch (err) {
      reject(new Error("Failed to initialize Google auth: " + err.message));
    }
  });
}

export function connectMemberCalendar(memberId) {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) return reject(new Error("Google Client ID not configured"));

    if (!window.google?.accounts?.oauth2) {
      return reject(new Error("Google Identity Services not loaded"));
    }

    // Use authorization code flow to get a refresh token for server-side sync.
    // The auth code is exchanged server-side via /api/google-token for
    // access_token + refresh_token. Refresh tokens last indefinitely.
    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: SCOPES,
      ux_mode: "popup",
      callback: async (resp) => {
        if (resp.error) return reject(new Error(resp.error));

        try {
          // Exchange auth code for tokens via server (gets refresh_token)
          const { apiUrl } = await import("lib/api");
          const tokenRes = await fetch(apiUrl("/api/google-token"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: resp.code,
              memberId,
              redirectUri: "postmessage",
            }),
          });

          const tokenData = await tokenRes.json();

          if (!tokenRes.ok || tokenData.error) {
            // Fallback to implicit flow if server exchange fails
            console.warn("[gcal] Server token exchange failed, falling back to implicit:", tokenData.error);
            return connectMemberCalendarImplicit(memberId).then(resolve).catch(reject);
          }

          // Cache access token for immediate client-side use
          setCachedToken(memberId, tokenData.access_token, tokenData.expires_in || 3600);

          resolve({
            accessToken: tokenData.access_token,
            calendarId: tokenData.calendarId || "primary",
            hasRefreshToken: tokenData.refresh_token, // boolean
          });
        } catch (err) {
          console.warn("[gcal] Code exchange failed, falling back to implicit:", err.message);
          connectMemberCalendarImplicit(memberId).then(resolve).catch(reject);
        }
      },
    });

    codeClient.requestCode();
  });
}

// Fallback: original implicit flow (no refresh token, 1hr access)
function connectMemberCalendarImplicit(memberId) {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: async (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        setCachedToken(memberId, resp.access_token, resp.expires_in);
        try {
          const calRes = await fetch(`${CALENDAR_API}/calendars/primary`, {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          const calData = await calRes.json();
          resolve({ accessToken: resp.access_token, calendarId: calData.id || "primary" });
        } catch {
          resolve({ accessToken: resp.access_token, calendarId: "primary" });
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectMemberCalendar(memberId) {
  const token = getCachedToken(memberId);
  if (token) {
    // Revoke the token
    window.google?.accounts?.oauth2?.revoke?.(token);
  }
  clearCachedToken(memberId);
}

// ── Calendar API calls ──

async function apiFetch(url, accessToken, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("AUTH_EXPIRED");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.error?.message || `Google API error ${res.status}`;
    const reason = err.error?.errors?.[0]?.reason || "";
    const error = new Error(message);
    error.reason = reason;
    error.status = res.status;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

export async function fetchGoogleEvents(accessToken, calendarId, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = await apiFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    accessToken
  );
  return (data.items || []).filter((e) => e.status !== "cancelled");
}

export async function createGoogleEvent(accessToken, calendarId, event) {
  return apiFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(event),
    }
  );
}

export async function updateGoogleEvent(accessToken, calendarId, eventId, event) {
  return apiFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(event),
    }
  );
}

export async function deleteGoogleEvent(accessToken, calendarId, eventId) {
  return apiFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    accessToken,
    { method: "DELETE" }
  );
}

// ── Conversion: Google Event ↔ Local Event ──

function googleEventToLocal(gEvent, familyId, memberId) {
  const isAllDay = !!gEvent.start?.date;
  return {
    family_id: familyId,
    member_id: memberId,
    title: gEvent.summary || "(No title)",
    start: isAllDay ? gEvent.start.date : gEvent.start.dateTime,
    end: isAllDay
      ? gEvent.end?.date || gEvent.start.date
      : gEvent.end?.dateTime || gEvent.start.dateTime,
    allDay: isAllDay,
    className: "info",
    source: "google",
    google_event_id: gEvent.id,
  };
}

function localEventToGoogle(event) {
  if (event.allDay) {
    const startDate = event.start.split("T")[0];
    const endDate = event.end ? event.end.split("T")[0] : startDate;
    // Google all-day end is exclusive, so add 1 day if start === end
    const endExclusive =
      startDate === endDate
        ? new Date(new Date(endDate).getTime() + 86400000).toISOString().split("T")[0]
        : endDate;
    return {
      summary: event.title,
      start: { date: startDate },
      end: { date: endExclusive },
    };
  }
  return {
    summary: event.title,
    start: { dateTime: event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: event.end || event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
}

// ── Direct push: create event on Google immediately ──
export async function pushEventToGoogle(member, event) {
  if (!member.google_calendar_id || !event.member_id) {
    console.warn("[gcal] Push skipped — no calendar connected for member:", member.name);
    return null;
  }

  try {
    // silentOnly=true — NEVER open popups from background operations.
    // If token expired, silent GIS refresh will try automatically.
    // If that fails too, return null (event saved locally, will sync via server cron).
    const accessToken = await requestAccessToken(member.id, member.google_calendar_id, true);
    const gEvent = localEventToGoogle(event);
    const created = await createGoogleEvent(accessToken, member.google_calendar_id, gEvent);
    return created?.id || null;
  } catch (err) {
    console.warn("[gcal] Push skipped for", member.name, "— will sync via server:", err.message);
    return null;
  }
}

// ── Direct update: push edited event to Google immediately ──
export async function pushEventUpdateToGoogle(member, event) {
  if (!member.google_calendar_id || !event.google_event_id) return false;

  try {
    const accessToken = await requestAccessToken(member.id, member.google_calendar_id, true);
    const gEvent = localEventToGoogle(event);
    await updateGoogleEvent(accessToken, member.google_calendar_id, event.google_event_id, gEvent);
    return true;
  } catch (err) {
    // Skip events that can't be modified (flights, hotels from Gmail)
    if (err.reason === "eventTypeRestriction" || (err.status === 400 && err.message?.includes("Event type"))) {
      console.log("[gcal] Skipping non-modifiable event:", event.title);
      return false;
    }
    console.warn("[gcal] Direct update push failed:", err.message);
    return false;
  }
}

// ── Direct delete: remove event from Google immediately ──
export async function pushEventDeleteToGoogle(member, googleEventId) {
  if (!member.google_calendar_id || !googleEventId) return false;

  try {
    const accessToken = await requestAccessToken(member.id, member.google_calendar_id, true);
    await deleteGoogleEvent(accessToken, member.google_calendar_id, googleEventId);
    return true;
  } catch (err) {
    console.warn("[gcal] Direct delete push failed:", err.message);
    return false;
  }
}

// ── Two-way sync for a single member ──

export async function syncMemberCalendar(member, localEvents, familyId, dispatch, silentOnly = false) {
  if (!member.google_calendar_id) return { pulled: 0, pushed: 0 };

  let accessToken;
  try {
    // Use google_calendar_id as login_hint — it's the member's email
    accessToken = await requestAccessToken(member.id, member.google_calendar_id, silentOnly);
  } catch {
    return { pulled: 0, pushed: 0, error: "Auth required — tap avatar to reconnect" };
  }

  const calendarId = member.google_calendar_id;

  // Sync window: 30 days back, 90 days forward
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);

  let pulled = 0;
  let pushed = 0;

  try {
    // ── PULL: Google → Local (with conflict resolution) ──
    const gEvents = await fetchGoogleEvents(accessToken, calendarId, timeMin, timeMax);
    const memberLocalEvents = localEvents.filter(
      (e) => e.member_id === member.id && (e.source === "google" || e.source === "synced")
    );
    const localByGoogleId = {};
    memberLocalEvents.forEach((e) => {
      if (e.google_event_id) localByGoogleId[e.google_event_id] = e;
    });

    const remoteIds = new Set();
    for (const gEvt of gEvents) {
      remoteIds.add(gEvt.id);
      const existing = localByGoogleId[gEvt.id];
      const converted = googleEventToLocal(gEvt, familyId, member.id);

      if (existing) {
        // Conflict resolution: compare timestamps — latest wins
        const googleUpdated = new Date(gEvt.updated || 0).getTime();
        const localUpdated = new Date(existing.updated_at || 0).getTime();

        if (googleUpdated > localUpdated) {
          // Google is newer — update local
          if (existing.title !== converted.title || existing.start !== converted.start || existing.end !== converted.end) {
            dispatch({ type: "UPDATE_EVENT", value: { ...existing, ...converted, id: existing.id, updated_at: gEvt.updated } });
            pulled++;
          }
        } else if (localUpdated > googleUpdated) {
          // Local is newer — push to Google instead of overwriting
          try {
            const updatedGoogle = localEventToGoogle(existing);
            await updateGoogleEvent(accessToken, calendarId, existing.google_event_id, updatedGoogle);
            pushed++;
          } catch (err) {
            // Skip non-modifiable events (flights, hotels from Gmail)
            if (err.reason === "eventTypeRestriction" || (err.status === 400 && err.message?.includes("Event type"))) {
              console.log(`[gcal] Skipping non-modifiable event: "${existing.title}"`);
            } else {
              console.warn(`[gcal] Failed to push local update for "${existing.title}":`, err.message);
            }
          }
        }
        // If timestamps are equal, no action needed
      } else {
        // New event from Google
        dispatch({
          type: "ADD_EVENT",
          value: {
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...converted,
            updated_at: gEvt.updated || new Date().toISOString(),
          },
        });
        pulled++;
      }
    }

    // Remove local events that were deleted in Google
    // BUT only if they weren't recently updated locally (within last 2 minutes)
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    for (const localEvt of memberLocalEvents) {
      if (localEvt.google_event_id && !remoteIds.has(localEvt.google_event_id)) {
        const localUpdated = new Date(localEvt.updated_at || 0).getTime();
        if (localUpdated < twoMinAgo) {
          // Deleted from Google and not recently edited locally — remove
          dispatch({ type: "REMOVE_EVENT", value: localEvt.id });
          pulled++;
        } else {
          // Recently edited locally — re-push to Google instead
          try {
            const gEvent = localEventToGoogle(localEvt);
            const created = await createGoogleEvent(accessToken, calendarId, gEvent);
            if (created?.id) {
              dispatch({
                type: "UPDATE_EVENT",
                value: { id: localEvt.id, google_event_id: created.id, source: "synced" },
              });
              pushed++;
            }
          } catch (err) {
            console.warn(`[gcal] Failed to re-push event "${localEvt.title}":`, err.message);
          }
        }
      }
    }

    // ── PUSH: Local → Google (new events) ──
    const memberManualEvents = localEvents.filter(
      (e) => e.member_id === member.id && e.source === "manual" && !e.google_event_id
    );

    for (const localEvt of memberManualEvents) {
      try {
        const gEvent = localEventToGoogle(localEvt);
        const created = await createGoogleEvent(accessToken, calendarId, gEvent);
        if (created?.id) {
          dispatch({
            type: "UPDATE_EVENT",
            value: { id: localEvt.id, google_event_id: created.id, source: "synced" },
          });
          pushed++;
        }
      } catch (err) {
        console.warn(`[gcal] Failed to push event "${localEvt.title}":`, err.message);
      }
    }
  } catch (err) {
    if (err.message === "AUTH_EXPIRED") {
      clearCachedToken(member.id);
      return { pulled, pushed, error: "Session expired — tap avatar to reconnect" };
    }
    return { pulled, pushed, error: err.message };
  }

  return { pulled, pushed };
}

// ── Delete a synced event from Google ──

export async function deleteSyncedEvent(member, eventGoogleId) {
  if (!member.google_calendar_id || !eventGoogleId) return;

  try {
    const accessToken = await requestAccessToken(member.id, member.google_calendar_id, true);
    await deleteGoogleEvent(accessToken, member.google_calendar_id, eventGoogleId);
  } catch (err) {
    console.warn("[gcal] Failed to delete from Google:", err.message);
  }
}

// ── Sync all connected members ──

export async function syncAllMembers(members, localEvents, familyId, dispatch, silentOnly = false) {
  const results = {};
  const connected = members.filter((m) => m.google_calendar_id);

  for (const member of connected) {
    results[member.id] = await syncMemberCalendar(member, localEvents, familyId, dispatch, silentOnly);
  }
  return results;
}
