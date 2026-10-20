import React from 'react';
import Badge from '../ui/Badge';
import { CheckCircle2, Clock, PlayCircle, AlertCircle } from 'lucide-react';

export default function TaskList({ tasks = [] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No subtasks defined for this research session.
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="space-y-3 py-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="p-3.5 rounded-lg border border-slate-200/90 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/30 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            {getStatusIcon(task.status)}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                  #{task.order}
                </span>
                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {task.title}
                </h4>
              </div>
              {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          <Badge status={task.status} />
        </div>
      ))}
    </div>
  );
}
