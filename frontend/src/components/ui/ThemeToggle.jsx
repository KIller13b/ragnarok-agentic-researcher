import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, setTheme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={`Current theme: ${theme} (click to change)`}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-400 transition-transform duration-200" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-200" />
        )}
        {showLabel && (
          <span className="text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
            {theme}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#29364B] shadow-lg py-1 z-50 text-xs">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
              theme === 'light'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
              theme === 'dark'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-blue-400" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
              theme === 'system'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-slate-500" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
