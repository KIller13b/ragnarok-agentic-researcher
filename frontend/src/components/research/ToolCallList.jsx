import React from 'react';
import Badge from '../ui/Badge';
import { Terminal, Clock, Cpu } from 'lucide-react';

export default function ToolCallList({ toolCalls = [] }) {
  if (!toolCalls || toolCalls.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No tool calls executed for this research session yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {toolCalls.map((call) => (
        <div
          key={call.id}
          className="p-3.5 rounded-lg border border-slate-200/90 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/30 font-mono text-xs"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-[#29364B]/70">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {call.toolName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {call.durationMs !== undefined && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {call.durationMs}ms
                </span>
              )}
              <Badge status={call.status} />
            </div>
          </div>

          {call.input && (
            <div className="mt-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Input
              </span>
              <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-200 text-[11px] overflow-x-auto whitespace-pre-wrap">
                {typeof call.input === 'object' ? JSON.stringify(call.input, null, 2) : String(call.input)}
              </pre>
            </div>
          )}

          {call.outputSummary && (
            <div className="mt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Output Summary
              </span>
              <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-sans text-xs bg-white dark:bg-[#0E172B] p-2 rounded border border-slate-200 dark:border-[#29364B]">
                {call.outputSummary}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
