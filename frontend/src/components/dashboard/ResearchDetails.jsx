import React from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  Globe,
  SlidersHorizontal,
  Sliders,
  Layers
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useResearch } from '../../context/ResearchContext';

export default function ResearchDetails() {
  const { selectedResearch } = useResearch();

  if (!selectedResearch) return null;

  const constraints = selectedResearch.constraints || {};

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Research Details
        </h3>
      </div>

      {/* Primary Key-Values */}
      <div className="space-y-2.5 text-xs pb-4 border-b border-slate-200/90 dark:border-[#29364B]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">ID</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
            #{selectedResearch.id}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status</span>
          <Badge status={selectedResearch.status} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Created</span>
          <span className="text-slate-800 dark:text-slate-200">
            {selectedResearch.createdAt || 'Apr 26, 2025, 10:24 AM'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Started</span>
          <span className="text-slate-800 dark:text-slate-200">
            {selectedResearch.startedAt || 'Apr 26, 2025, 10:26 AM'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Updated</span>
          <span className="text-slate-800 dark:text-slate-200">
            {selectedResearch.updatedAt || 'Apr 26, 2025, 10:28 AM'}
          </span>
        </div>
      </div>

      {/* Constraints Section */}
      <div className="pt-4">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Constraints</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Deadline */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Deadline</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {constraints.deadline || 'Not set'}
            </span>
          </div>

          {/* Budget */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Budget</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {constraints.budget || 'Not set'}
            </span>
          </div>

          {/* Source Types */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Source Types</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {constraints.preferredSourceTypes || 'Any source'}
            </span>
          </div>

          {/* Max Sources */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Max Sources</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {constraints.maxSources || 'Not set'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
