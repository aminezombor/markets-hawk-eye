import { Moon, Sun } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  variant?: "document" | "map";
}

export function AppShell({ children, theme, onThemeToggle, variant = "document" }: AppShellProps) {
  useEffect(() => {
    document.body.classList.toggle("map-route-active", variant === "map");
    document.body.classList.toggle("document-route-active", variant !== "map");
    document.title = variant === "map"
      ? "Markets HAWK-EYE | Strategic Dependency Map"
      : "About | Markets HAWK-EYE";
    return () => {
      document.body.classList.remove("map-route-active", "document-route-active");
    };
  }, [variant]);

  return (
    <div className={`site-shell site-shell--${variant}`}>
      <header className="site-topbar">
        <NavLink to="/" end className="site-brand" aria-label="Markets HAWK-EYE map">
          <span className="site-brand-mark" aria-hidden />
          <span>Markets HAWK-EYE</span>
        </NavLink>
        <nav className="site-nav" aria-label="Primary navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>Map</NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : undefined)}>About</NavLink>
        </nav>
        <button
          type="button"
          className="site-icon-button"
          onClick={onThemeToggle}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>
      </header>
      <main className={`site-main site-main--${variant}`}>{children}</main>
    </div>
  );
}
