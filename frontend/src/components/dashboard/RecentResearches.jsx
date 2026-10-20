import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useResearch } from '../../context/ResearchContext';

export default function RecentResearches() {
  const { researches, selectedResearchId, selectResearch } = useResearch();

  // Show top 5 recent researches
  const recentList = researches.slice(0, 5);

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Recent Researches
        </h3>
        <Link
          to="/my-researches"
          className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {recentList.map((item) => {
          const isSelected = item.id === selectedResearchId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectResearch(item.id)}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-3 border ${
                isSelected
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 shadow-xs'
                  : 'bg-transparent hover:bg-slate-50 dark:hover:bg-[#14203A]/40 border-transparent hover:border-slate-200/60 dark:hover:border-[#29364B]/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge status={item.status} />
                <span className="text-[11px] text-slate-400 whitespace-nowrap hidden sm:inline-block">
                  {item.timeAgo}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
