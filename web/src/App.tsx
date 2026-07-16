import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { loadDatasets } from "./data/loadGraph";
import { AboutPage } from "./pages/AboutPage";
import { MapPage } from "./pages/MapPage";
import type { GraphDataset } from "./types/graph";

const THEME_KEY = "markets-hawk-eye-theme";

function getInitialTheme(): "light" | "dark" {
  return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export default function App() {
  const [datasets, setDatasets] = useState<GraphDataset[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(() => getInitialTheme());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets()
      .then((loaded) => {
        setDatasets(loaded);
        setError(null);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load graph datasets.");
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  if (error) {
    return (
      <div className="boot-screen">
        <strong>Markets HAWK-EYE could not load.</strong>
        <p>{error}</p>
        <span>Run pnpm run sync-data before starting the development server.</span>
      </div>
    );
  }

  if (!datasets.length) {
    return (
      <div className="boot-screen">
        <span className="boot-mark" aria-hidden />
        <strong>Loading Markets HAWK-EYE</strong>
        <p>Preparing the strategic dependency maps...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell theme={theme} onThemeToggle={toggleTheme} variant="map">
              <MapPage datasets={datasets} theme={theme} onThemeToggle={toggleTheme} />
            </AppShell>
          }
        />
        <Route
          path="/about"
          element={
            <AppShell theme={theme} onThemeToggle={toggleTheme}>
              <AboutPage datasets={datasets} />
            </AppShell>
          }
        />
        <Route path="/map" element={<Navigate to="/" replace />} />
        <Route path="/methodology" element={<Navigate to="/about#methodology" replace />} />
        <Route path="/data" element={<Navigate to="/about#data" replace />} />
        <Route path="/hunter" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/world-state" element={<Navigate to="/" replace />} />
        <Route path="/council" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="/hunt/:id" element={<Navigate to="/" replace />} />
        <Route path="/opportunity/:id" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
