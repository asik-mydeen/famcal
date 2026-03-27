import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";
import { AuthProvider } from "context/AuthContext";
import { FamilyProvider } from "context/FamilyContext";
import { ThemeModeProvider } from "context/ThemeContext";
const root = createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AuthProvider>
      <ThemeModeProvider>
        <FamilyProvider>
          <App />
        </FamilyProvider>
      </ThemeModeProvider>
    </AuthProvider>
  </BrowserRouter>
);

// Service worker registration disabled — CRA 5 requires cra-template-pwa
// for proper service worker support. The offline banner in App.js still works.
