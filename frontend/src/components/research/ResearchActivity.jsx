import React from 'react';
import { FileText, Square, CheckCircle, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ResearchTabs from './ResearchTabs';
import ActivityTimeline from './ActivityTimeline';
import TaskList from './TaskList';
import EvidenceList from './EvidenceList';
import ToolCallList from './ToolCallList';
import { useResearch } from '../../context/ResearchContext';

export default function ResearchActivity() {
  const {
    selectedResearch,
    activeTab,
    setActiveTab,
    stopResearch,
    completeResearch,
  } = useResearch();

  if (!selectedResearch) return null;

  const isCompleted = selectedResearch.status === 'completed';
  const isFailed = selectedResearch.status === 'failed';
  const isInProgress = !isCompleted && !isFailed;

  const counts = {
    tasks: selectedResearch.tasks?.length || 0,
    evidence: selectedResearch.evidence?.length || 0,
    tool_calls: selectedResearch.toolCalls?.length || 0,
  };

  return (
    <Card className="p-5 sm:p-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {selectedResearch.title}
              </h3>
              <Badge status={selectedResearch.status} />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Started {selectedResearch.timeAgo || 'recently'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-xl">
              {selectedResearch.question}
            </p>
          </div>
        </div>

        {/* Action Buttons: Stop / Fast-forward */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isInProgress ? (
            <>
              <button
                type="button"
                onClick={() => completeResearch(selectedResearch.id)}
                title="Advance mock simulation to completed state"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finish Mock</span>
              </button>

              <button
                type="button"
                onClick={() => stopResearch(selectedResearch.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 font-mono">
              Session {selectedResearch.status}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ResearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Tab Panels */}
      <div className="pt-4">
        {activeTab === 'agent_activity' && (
          <ActivityTimeline steps={selectedResearch.activitySteps} />
        )}

        {activeTab === 'tasks' && (
          <TaskList tasks={selectedResearch.tasks} />
        )}

        {activeTab === 'evidence' && (
          <EvidenceList evidence={selectedResearch.evidence} />
        )}

        {activeTab === 'tool_calls' && (
          <ToolCallList toolCalls={selectedResearch.toolCalls} />
        )}

        {activeTab === 'report' && (
          <div className="py-2">
            {selectedResearch.report ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#29364B]">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedResearch.report.title}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Generated {selectedResearch.report.generatedAt}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedResearch.report.executiveSummary}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  See the full breakdown in the Research Results card below ↓
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Report will be compiled once the agent finishes evaluating evidence.
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
