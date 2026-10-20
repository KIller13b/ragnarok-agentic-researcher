import React, { useState } from 'react';
import { FileEdit, Calendar, DollarSign, Globe, Play, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useResearch } from '../../context/ResearchContext';

const DEFAULT_QUESTION =
  'Compare three free AI coding tools for a college hackathon. Research their features, supported programming languages, limitations, and internet requirements. Recommend one for a beginner team and justify the recommendation.';

export default function ResearchForm({ onStarted }) {
  const { startNewResearch } = useResearch();

  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [preferredSourceTypes, setPreferredSourceTypes] = useState('Any source');
  const [maxSources, setMaxSources] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please enter a research question or topic to begin.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const newId = startNewResearch({
        question: question.trim(),
        constraints: {
          deadline: deadline || 'Not set',
          budget: budget ? Number(budget) : null,
          preferredSourceTypes,
          maxSources: maxSources ? Number(maxSources) : null,
        },
      });

      if (onStarted) onStarted(newId);
    } finally {
      setTimeout(() => setSubmitting(false), 400);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <FileEdit className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Start a New Research
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ask a question and let the agent research, analyze and generate a report for you.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Research Question Textarea */}
        <div>
          <label htmlFor="research-question" className="sr-only">
            Research Question
          </label>
          <textarea
            id="research-question"
            rows={4}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ask a question or describe what you want the research agent to investigate..."
            className={`w-full p-3.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#111C30] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all resize-y ${
              error
                ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-[#29364B]'
            }`}
          />
          {error && (
            <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Optional Constraints Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Deadline */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Deadline <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Budget <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="No limit"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Preferred Source Types */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Preferred source types <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={preferredSourceTypes}
                onChange={(e) => setPreferredSourceTypes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="Any source">Any source</option>
                <option value="Official documentation">Official documentation</option>
                <option value="Academic papers">Academic papers</option>
                <option value="News & Journalism">News & Journalism</option>
                <option value="Developer forums">Developer forums</option>
                <option value="Technical blogs">Technical blogs</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Play}
            loading={submitting}
            className="px-6 py-2.5 font-medium rounded-lg text-sm bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            Start Research
          </Button>
        </div>
      </form>
    </Card>
  );
}
