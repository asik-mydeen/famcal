import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { supabase } from "lib/supabase";

const AuthContext = createContext(null);

// Google scopes needed for the app
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState(
    () => localStorage.getItem("famcal_provider_token") || null
  );

  const extractUser = (session) => {
    if (!session?.user) return null;
    return {
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
      picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || "",
      googleId: session.user.user_metadata?.provider_id || session.user.id,
    };
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userData = extractUser(session);
      if (userData) setUser(userData);
      // Restore provider token from session if available
      // NOTE: provider_token is only in the session right after OAuth redirect, not on subsequent getSession() calls
      if (session?.provider_token) {
        console.log("[auth] Provider token captured from session (has photos+calendar scopes)");
        setProviderToken(session.provider_token);
        localStorage.setItem("famcal_provider_token", session.provider_token);
      } else {
        // Check localStorage fallback
        const storedToken = localStorage.getItem("famcal_provider_token");
        if (storedToken) {
          console.log("[auth] Provider token restored from localStorage");
          setProviderToken(storedToken);
        } else {
          console.log("[auth] No provider token available — photos won't work until re-sign-in");
        }
      }
      if (session?.provider_refresh_token) {
        console.log("[auth] Provider refresh token captured");
        localStorage.setItem("famcal_provider_refresh_token", session.provider_refresh_token);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Auth session check failed:", err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] onAuthStateChange:", event, "provider_token:", Boolean(session?.provider_token));
      const userData = extractUser(session);
      if (userData) {
        setUser(userData);
        // Capture provider token on sign-in (only available at sign-in time, SIGNED_IN event)
        if (session?.provider_token) {
          console.log("[auth] NEW provider token captured from", event, "event");
          setProviderToken(session.provider_token);
          localStorage.setItem("famcal_provider_token", session.provider_token);
        }
        if (session?.provider_refresh_token) {
          console.log("[auth] NEW provider refresh token captured");
          localStorage.setItem("famcal_provider_refresh_token", session.provider_refresh_token);
        }
      } else {
        setUser(null);
        setProviderToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    const prodUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: prodUrl,
        scopes: GOOGLE_SCOPES,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) console.error("Sign in error:", error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProviderToken(null);
    localStorage.removeItem("famcal_auth_user");
    localStorage.removeItem("famcal_setup_done");
    localStorage.removeItem("famcal_provider_token");
    localStorage.removeItem("famcal_provider_refresh_token");
    localStorage.removeItem("famcal_photos_token");
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, providerToken }),
    [user, loading, signIn, signOut, providerToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { AuthProvider, useAuth };
