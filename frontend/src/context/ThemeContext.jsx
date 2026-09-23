import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function applyThemeToDOM(themeMode) {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const body = document.body;

  let isDark = false;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    // System preference
    isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (body) {
      body.classList.add('dark');
      body.setAttribute('data-theme', 'dark');
    }
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.setAttribute('data-theme', 'light');
    }
  }

  return isDark;
}

export function ThemeProvider({ children }) {
  // Mode: 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('apex_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const [resolvedIsDark, setResolvedIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_theme') || 'system';
      return applyThemeToDOM(saved);
    } catch {
      return false;
    }
  });

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('apex_theme', newTheme);
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
    const isDark = applyThemeToDOM(newTheme);
    setResolvedIsDark(isDark);
  }, []);

  useEffect(() => {
    const isDark = applyThemeToDOM(theme);
    setResolvedIsDark(isDark);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        const isDarkSys = applyThemeToDOM('system');
        setResolvedIsDark(isDarkSys);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: resolvedIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
