import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useResearch } from '../context/ResearchContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { resetMockData } = useResearch();

  const [saved, setSaved] = useState(false);
  const [defaultSources, setDefaultSources] = useState('10');
  const [defaultSourceType, setDefaultSourceType] = useState('Any source');
  const [autoScroll, setAutoScroll] = useState(true);

  const handleSaveDefaults = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all mock research data back to factory demo state?')) {
      resetMockData();
      alert('Mock research sessions reset successfully.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure appearance theme, research engine defaults, and local data persistence.
          </p>
        </div>
      </div>

      {/* 1. Theme and Appearance */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/90 dark:border-[#29364B]">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Appearance & Theme
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Select an interface theme. The sidebar retains high-contrast deep navy branding across all settings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'light'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/20 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <Sun className="w-5 h-5 text-amber-500" />
              {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Light Mode
              </p>
              <p className="text-[11px] text-slate-400">Subtle clean slate #F5F8FC</p>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/20 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <Moon className="w-5 h-5 text-blue-400" />
              {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Dark Mode
              </p>
              <p className="text-[11px] text-slate-400">Deep obsidian #0B1120</p>
            </div>
          </button>

          {/* System Theme */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'system'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/20 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <Laptop className="w-5 h-5 text-slate-500" />
              {theme === 'system' && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                System Default
              </p>
              <p className="text-[11px] text-slate-400">Follow OS color scheme</p>
            </div>
          </button>
        </div>
      </Card>

      {/* 2. Default Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/90 dark:border-[#29364B]">
          <Sliders className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Default Research Preferences
          </h2>
        </div>

        <form onSubmit={handleSaveDefaults} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Maximum Sources
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={defaultSources}
                onChange={(e) => setDefaultSources(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Preferred Source Type
              </label>
              <select
                value={defaultSourceType}
                onChange={(e) => setDefaultSourceType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
              >
                <option value="Any source">Any source</option>
                <option value="Official documentation">Official documentation</option>
                <option value="Academic papers">Academic papers</option>
                <option value="News & Journalism">News & Journalism</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {saved ? 'Preferences saved!' : ''}
            </span>
            <Button type="submit" variant="primary" size="sm">
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Data & Factory Reset */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/90 dark:border-[#29364B]">
          <RotateCcw className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Mock Data Management
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Reset Demo Researches & Local Storage
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg">
              Restores the default mock data state matching the reference dashboard (including the active "AI coding tools for hackathon" demo).
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
          >
            Reset Mock Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
