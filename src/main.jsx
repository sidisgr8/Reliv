// src/main.jsx
import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// 👇 THIS LINE BOOTS i18next (must be before <App/> renders)
import "./i18n";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Suspense lets react-i18next wait for resources without showing keys */}
    <Suspense fallback={null}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Suspense>
  </StrictMode>
);
