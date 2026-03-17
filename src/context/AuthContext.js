import { createContext, useContext, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";

const AuthContext = createContext(null);

function decodeGoogleJwt(token) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("famcal_auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const signIn = useCallback((credentialResponse) => {
    const decoded = decodeGoogleJwt(credentialResponse.credential);
    if (!decoded) return false;

    const userData = {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      googleId: decoded.sub,
    };

    localStorage.setItem("famcal_auth_user", JSON.stringify(userData));
    setUser(userData);
    return true;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("famcal_auth_user");
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { AuthProvider, useAuth };
