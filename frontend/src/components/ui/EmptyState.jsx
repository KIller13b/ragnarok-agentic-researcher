import React from 'react';
import { FileSearch } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FileSearch,
  title = 'No report available yet',
  description = 'The agent is still working on your research. Check back later or view the live progress above.',
  action,
  className = '',
}) {
  return (
    <div
      className={`border border-slate-200/90 dark:border-[#29364B] rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/60 dark:bg-[#14203A]/40 transition-colors ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
        <Icon className="w-8 h-8 opacity-80" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
