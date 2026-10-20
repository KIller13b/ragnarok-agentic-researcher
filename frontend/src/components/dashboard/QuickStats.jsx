import React from 'react';
import { Gauge, FileText, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import Card from '../ui/Card';
import { useResearch } from '../../context/ResearchContext';

export default function QuickStats() {
  const { quickStats } = useResearch();

  const statItems = [
    {
      label: 'Total Researches',
      value: quickStats.total,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/50',
    },
    {
      label: 'Completed',
      value: quickStats.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50',
    },
    {
      label: 'In Progress',
      value: quickStats.inProgress,
      icon: ShieldAlert,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/50',
    },
    {
      label: 'Failed',
      value: quickStats.failed,
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/50',
    },
  ];

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Gauge className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Quick Stats
        </h3>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/30 flex items-center gap-3 transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-none">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
