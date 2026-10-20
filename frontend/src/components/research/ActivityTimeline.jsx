import React from 'react';
import {
  FileText,
  Search,
  ShieldCheck,
  FileCheck,
  Check,
  Clock,
  AlertTriangle
} from 'lucide-react';

const STEP_ICONS = [
  FileText,
  Search,
  ShieldCheck,
  FileCheck,
];

export default function ActivityTimeline({ steps = [] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No activity steps recorded for this session.
      </div>
    );
  }

  const getStepVisuals = (status, idx) => {
    switch (status) {
      case 'completed':
        return {
          circleBg: 'bg-emerald-500 text-white border-emerald-500',
          iconColor: 'text-emerald-500',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
          badgeText: 'text-slate-400 dark:text-slate-500',
        };
      case 'in_progress':
        return {
          circleBg: 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/20 animate-pulse',
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
          badgeText: 'text-blue-600 dark:text-blue-400 font-medium',
        };
      case 'failed':
        return {
          circleBg: 'bg-rose-500 text-white border-rose-500',
          iconColor: 'text-rose-500',
          iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40',
          badgeText: 'text-rose-500 font-medium',
        };
      default: // pending
        return {
          circleBg: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600',
          iconColor: 'text-slate-400 dark:text-slate-500',
          iconBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          badgeText: 'text-slate-400 dark:text-slate-500',
        };
    }
  };

  return (
    <div className="relative py-2">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const visuals = getStepVisuals(step.status, idx);
        const IconComponent = STEP_ICONS[idx % STEP_ICONS.length] || FileText;

        return (
          <div key={step.id || idx} className="relative flex items-start gap-4 pb-7 last:pb-2">
            {/* Connecting vertical line */}
            {!isLast && (
              <div
                className="absolute left-[13px] top-[28px] bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700/80"
                aria-hidden="true"
              />
            )}

            {/* Numbered Circle */}
            <div
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border transition-all duration-200 ${visuals.circleBg}`}
            >
              {step.status === 'completed' ? (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                idx + 1
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 flex items-start justify-between gap-4 -mt-0.5">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${visuals.iconBg} ${visuals.iconColor}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Timestamp or Status Badge on Right */}
              <div className={`text-xs shrink-0 whitespace-nowrap pt-0.5 ${visuals.badgeText}`}>
                {step.time || (step.status === 'pending' ? 'Pending' : '')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
