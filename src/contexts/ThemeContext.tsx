"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Color themes - same as AnimatedOffice but now global
export const THEMES = {
  default: {
    name: "Default Dark",
    bg: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    working: "#3fb950",
    idle: "#d29922",
    offline: "#8b949e",
    task: "#58a6ff",
    data: "#3fb950",
    review: "#d29922",
    accent: "#58a6ff",
    text: "#e6edf3",
    muted: "#8b949e",
  },
  neon: {
    name: "Neon Cyber",
    bg: "#0a0a0f",
    surface: "#12121a",
    border: "#1e1e2e",
    working: "#00ff88",
    idle: "#ffaa00",
    offline: "#666666",
    task: "#00d4ff",
    data: "#00ff88",
    review: "#ff6b00",
    accent: "#bf00ff",
    text: "#ffffff",
    muted: "#666688",
  },
  midnight: {
    name: "Midnight Blue",
    bg: "#0d1421",
    surface: "#141e30",
    border: "#1f3044",
    working: "#4ade80",
    idle: "#fbbf24",
    offline: "#6b7280",
    task: "#60a5fa",
    data: "#34d399",
    review: "#f59e0b",
    accent: "#818cf8",
    text: "#f1f5f9",
    muted: "#64748b",
  },
  sunset: {
    name: "Sunset Warm",
    bg: "#1a1210",
    surface: "#261a15",
    border: "#3d2a20",
    working: "#22c55e",
    idle: "#f97316",
    offline: "#78716c",
    task: "#fb923c",
    data: "#fbbf24",
    review: "#ef4444",
    accent: "#f43f5e",
    text: "#fef3c7",
    muted: "#a8a29e",
  },
  forest: {
    name: "Forest Green",
    bg: "#0d1410",
    surface: "#142018",
    border: "#1f3022",
    working: "#4ade80",
    idle: "#a3e635",
    offline: "#6b7280",
    task: "#2dd4bf",
    data: "#4ade80",
    review: "#84cc16",
    accent: "#22d3ee",
    text: "#ecfdf5",
    muted: "#6b8e7a",
  },
  lavender: {
    name: "Lavender Dream",
    bg: "#13111a",
    surface: "#1c1826",
    border: "#2d2640",
    working: "#a78bfa",
    idle: "#f0abfc",
    offline: "#6b7280",
    task: "#c084fc",
    data: "#a78bfa",
    review: "#f472b6",
    accent: "#e879f9",
    text: "#f5f3ff",
    muted: "#8b7db8",
  },
  matrix: {
    name: "Matrix",
    bg: "#000a00",
    surface: "#001400",
    border: "#003300",
    working: "#00ff00",
    idle: "#88ff00",
    offline: "#004400",
    task: "#00ff00",
    data: "#00cc00",
    review: "#88ff00",
    accent: "#00ff88",
    text: "#00ff00",
    muted: "#006600",
  },
  ocean: {
    name: "Deep Ocean",
    bg: "#071318",
    surface: "#0c1e26",
    border: "#163040",
    working: "#06b6d4",
    idle: "#38bdf8",
    offline: "#475569",
    task: "#22d3ee",
    data: "#06b6d4",
    review: "#0ea5e9",
    accent: "#67e8f9",
    text: "#e0f2fe",
    muted: "#5b8a9a",
  },
  ember: {
    name: "Ember Glow",
    bg: "#150a0a",
    surface: "#201010",
    border: "#3a1818",
    working: "#ef4444",
    idle: "#f97316",
    offline: "#57534e",
    task: "#f43f5e",
    data: "#ef4444",
    review: "#fb923c",
    accent: "#ff6b6b",
    text: "#fef2f2",
    muted: "#a87070",
  },
};

export type ThemeKey = keyof typeof THEMES;
export type ThemeColors = typeof THEMES[ThemeKey];

interface ThemeContextType {
  theme: ThemeKey;
  colors: ThemeColors;
  setTheme: (theme: ThemeKey) => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>("default");
  const [mounted, setMounted] = useState(false);

  // Load theme from API on mount
  useEffect(() => {
    setMounted(true);
    loadTheme();
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    if (!mounted) return;

    const colors = THEMES[theme];
    const root = document.documentElement;

    root.style.setProperty("--color-bg", colors.bg);
    root.style.setProperty("--color-surface", colors.surface);
    root.style.setProperty("--color-border", colors.border);
    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-text", colors.text);
    root.style.setProperty("--color-text-muted", colors.muted);
    root.style.setProperty("--color-working", colors.working);
    root.style.setProperty("--color-idle", colors.idle);
    root.style.setProperty("--color-offline", colors.offline);
    root.style.setProperty("--color-task", colors.task);
    root.style.setProperty("--color-data", colors.data);
    root.style.setProperty("--color-review", colors.review);
  }, [theme, mounted]);

  async function loadTheme() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.theme && THEMES[data.theme as ThemeKey]) {
        setThemeState(data.theme as ThemeKey);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  }

  async function setTheme(newTheme: ThemeKey) {
    setThemeState(newTheme);

    // Save to API
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }

  const colors = THEMES[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
