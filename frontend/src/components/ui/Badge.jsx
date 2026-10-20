import React from 'react';

export default function Badge({ status, text, className = '' }) {
  const normalizedStatus = (status || '').toLowerCase().replace('-', '_');

  const getStyle = () => {
    switch (normalizedStatus) {
      case 'completed':
      case 'verified':
      case 'succeeded':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50';
      case 'in_progress':
      case 'researching':
      case 'planning':
      case 'running':
      case 'evaluating':
      case 'generating_report':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50';
      case 'queued':
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getLabel = () => {
    if (text) return text;
    switch (normalizedStatus) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'queued':
        return 'Queued';
      case 'planning':
        return 'Planning';
      case 'researching':
        return 'Researching';
      case 'evaluating':
        return 'Evaluating';
      case 'generating_report':
        return 'Generating Report';
      case 'pending':
        return 'Pending';
      case 'succeeded':
        return 'Succeeded';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()} ${className}`}
    >
      {getLabel()}
    </span>
  );
}
