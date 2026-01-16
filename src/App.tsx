import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Experience } from "./components/Experience";
import { LandingPage } from "./pages/LandingPage";
import { ProjectPage } from "./pages/ProjectPage";

import "./styles.css";

/**
 * Skip la landing page en développement si VITE_SKIP_LANDING=true
 * Dans .env.local: VITE_SKIP_LANDING=true
 */
const SKIP_LANDING = import.meta.env.VITE_SKIP_LANDING === "true";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            SKIP_LANDING ? (
              <Navigate to="/experience" replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route path="/projet" element={<ProjectPage />} />
        <Route path="/experience" element={<Experience />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
