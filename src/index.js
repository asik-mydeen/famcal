import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";
import { AuthProvider } from "context/AuthContext";
import { FamilyProvider } from "context/FamilyContext";
import { ThemeModeProvider } from "context/ThemeContext";
import * as serviceWorkerRegistration from "serviceWorkerRegistration";

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

// Register service worker for offline PWA support
serviceWorkerRegistration.register();
