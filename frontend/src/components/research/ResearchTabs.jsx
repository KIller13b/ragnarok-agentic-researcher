import React from 'react';

const TABS = [
  { id: 'agent_activity', label: 'Agent Activity' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'tool_calls', label: 'Tool Calls' },
  { id: 'report', label: 'Report' },
];

export default function ResearchTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <div className="border-b border-slate-200/90 dark:border-[#29364B] flex items-center gap-1 sm:gap-6 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`py-3 px-1 text-xs sm:text-sm font-medium relative whitespace-nowrap transition-colors flex items-center gap-1.5 focus:outline-none ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
            {/* Blue Underline */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
