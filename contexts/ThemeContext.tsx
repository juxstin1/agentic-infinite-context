import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'pink';

export interface ThemePreferences {
  theme: Theme;
  accentColor: AccentColor;
  reducedMotion: boolean;
  fontSize: 'sm' | 'base' | 'lg';
  compactMode: boolean;
}

interface ThemeContextType {
  preferences: ThemePreferences;
  actualTheme: 'light' | 'dark';
  updatePreferences: (prefs: Partial<ThemePreferences>) => void;
  resetPreferences: () => void;
}

const defaultPreferences: ThemePreferences = {
  theme: 'dark',
  accentColor: 'purple',
  reducedMotion: false,
  fontSize: 'base',
  compactMode: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'agentic-theme-preferences';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      } catch {
        return defaultPreferences;
      }
    }
    return defaultPreferences;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate actual theme
  const actualTheme: 'light' | 'dark' =
    preferences.theme === 'system' ? systemTheme : preferences.theme;

  // Update document class and CSS variables
  useEffect(() => {
    const root = document.documentElement;

    // Theme class
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);

    // Accent color
    const accentColors = {
      purple: { h: 270, s: 70, l: 60 },
      blue: { h: 215, s: 70, l: 60 },
      green: { h: 145, s: 65, l: 55 },
      orange: { h: 25, s: 75, l: 60 },
      pink: { h: 330, s: 70, l: 65 },
    };

    const color = accentColors[preferences.accentColor];
    root.style.setProperty('--accent-h', color.h.toString());
    root.style.setProperty('--accent-s', `${color.s}%`);
    root.style.setProperty('--accent-l', `${color.l}%`);

    // Font size
    const fontSizes = {
      sm: '14px',
      base: '16px',
      lg: '18px',
    };
    root.style.setProperty('--base-font-size', fontSizes[preferences.fontSize]);

    // Reduced motion
    if (preferences.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.style.setProperty('--animation-duration', '250ms');
    }

    // Compact mode
    root.classList.toggle('compact', preferences.compactMode);
  }, [actualTheme, preferences]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (prefs: Partial<ThemePreferences>) => {
    setPreferences(current => ({ ...current, ...prefs }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        actualTheme,
        updatePreferences,
        resetPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
