import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, User, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

export default function Header({ onOpenMobile, title = 'Dashboard' }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-200/90 dark:border-[#29364B] px-4 sm:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 hidden sm:inline-block">
            MERN Demo
          </span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden md:block">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-xs border border-slate-300 dark:border-slate-600">
              JD
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:inline-block">
              John Doe
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden sm:inline-block" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#29364B] shadow-lg py-1.5 z-50 text-sm">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-slate-100">John Doe</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">researcher@college.edu</p>
              </div>
              <div className="py-1">
                <div className="px-4 py-1.5 text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Role: Hackathon Lead</span>
                </div>
                <div className="px-4 py-1.5 text-xs text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Credits: Unlimited Local</span>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
