import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';

export default function ThemeSelector({ className = '' }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Live Active Icon */}
      <span className="absolute left-2.5 pointer-events-none flex items-center justify-center text-slate-500 dark:text-slate-400 z-10">
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : theme === 'light' ? (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <Laptop className="w-3.5 h-3.5 text-blue-500" />
        )}
      </span>

      {/* Dropdown Form Select */}
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition-colors"
        aria-label="Theme Mode Selection"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>

      {/* Down Chevron */}
      <span className="absolute right-2 pointer-events-none flex items-center justify-center text-slate-400">
        <ChevronDown className="w-3 h-3" />
      </span>
    </div>
  );
}
