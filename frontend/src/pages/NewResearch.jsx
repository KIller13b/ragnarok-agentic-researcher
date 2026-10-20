import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  FileEdit,
  Play,
  Calendar,
  DollarSign,
  Globe,
  SlidersHorizontal,
  Lightbulb,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useResearch } from '../context/ResearchContext';

const EXAMPLE_QUERIES = [
  'Compare three free AI coding tools for a college hackathon. Research their features, supported programming languages, limitations, and internet requirements.',
  'Analyze the cost-benefit of migrating a Node.js Express backend to serverless AWS Lambda for variable traffic under 50k daily active users.',
  'Evaluate emerging open-weight reasoning models (DeepSeek-R1, Qwen 2.5) for local deployment on Apple Silicon laptops with 32GB unified memory.',
];

export default function NewResearch() {
  const navigate = useNavigate();
  const { startNewResearch } = useResearch();

  const [question, setQuestion] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [preferredSourceTypes, setPreferredSourceTypes] = useState('Any source');
  const [maxSources, setMaxSources] = useState('10');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please provide a research question or topic.');
      return;
    }
    setError('');
    setLoading(true);

    startNewResearch({
      question: question.trim(),
      constraints: {
        deadline: deadline || 'Not set',
        budget: budget ? Number(budget) : null,
        preferredSourceTypes,
        maxSources: maxSources ? Number(maxSources) : null,
      },
    });

    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 300);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Start New Research
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define your inquiry parameters, specify preferred sources, and dispatch autonomous investigation.
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Research Inquiry / Question <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (error) setError('');
              }}
              placeholder="E.g., Compare three free AI coding tools for a college hackathon. Research their features, supported programming languages, limitations, and internet requirements. Recommend one for a beginner team..."
              className={`w-full p-4 text-sm rounded-xl border bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#111C30] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all ${
                error
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-[#29364B]'
              }`}
            />
            {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
          </div>

          {/* Quick Example Templates */}
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Or click a template to pre-fill:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="text-left text-xs p-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors line-clamp-1 max-w-md"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Constraints Grid */}
          <div className="pt-2 border-t border-slate-200/90 dark:border-[#29364B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Research Constraints & Filters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Deadline
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Budget Cap
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    placeholder="No budget limit"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preferred Source Types */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Source Types
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={preferredSourceTypes}
                    onChange={(e) => setPreferredSourceTypes(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Any source">Any source (All reliable public web)</option>
                    <option value="Official documentation">Official documentation only</option>
                    <option value="Academic papers">Peer-reviewed academic papers</option>
                    <option value="News & Journalism">Reputable news sources</option>
                    <option value="Developer forums">Developer forums & communities</option>
                  </select>
                </div>
              </div>

              {/* Max Sources */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Sources to Synthesize
                </label>
                <div className="relative">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxSources}
                    onChange={(e) => setMaxSources(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#0E172B]/60 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#111C30] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/90 dark:border-[#29364B]">
            <span className="text-xs text-slate-400">
              * Frontend mock execution will simulate multi-step research on submit.
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Play}
                loading={loading}
              >
                Launch Research Agent
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
