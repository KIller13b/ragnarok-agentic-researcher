import React from 'react';
import { ExternalLink, ShieldCheck, Bookmark } from 'lucide-react';

export default function EvidenceList({ evidence = [] }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No evidence collected for this research session yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {evidence.map((item) => (
        <div
          key={item.id}
          className="p-3.5 rounded-lg border border-slate-200/90 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 capitalize">
                {item.sourceType || 'source'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {item.domain}
              </span>
            </div>
            {item.qualityScore !== undefined && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/50 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {Math.round(item.qualityScore * 100)}% Quality
              </span>
            )}
          </div>

          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-2">
            {item.title}
          </h4>

          {item.snippet && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed bg-white/60 dark:bg-[#0E172B]/60 p-2.5 rounded-md border border-slate-200/60 dark:border-[#29364B]/60">
              "{item.snippet}"
            </p>
          )}

          {item.url && (
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[280px] sm:max-w-md">{item.url}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 ml-2 shrink-0 font-medium"
              >
                <span>Visit source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
