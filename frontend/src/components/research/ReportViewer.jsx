import React, { useState } from 'react';
import {
  Lightbulb,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Award,
  BookOpen,
  FileSearch,
  Sparkles
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useResearch } from '../../context/ResearchContext';

export default function ReportViewer() {
  const { selectedResearch, completeResearch } = useResearch();
  const [copied, setCopied] = useState(false);

  if (!selectedResearch) return null;

  const report = selectedResearch.report;

  const handleCopy = () => {
    if (!report) return;

    // Prefer the agent's own Markdown: it is the complete, citation-audited
    // document (findings, [n] citations, references, limitations). The
    // hand-rolled fallback below would silently drop all of that.
    const text =
      report.markdown && report.markdown.trim().length > 0
        ? report.markdown.trim()
        : `
# ${report.title || 'Research Report'}
Generated: ${report.generatedAt || 'N/A'}
Confidence: ${Math.round((report.confidenceScore || 0.9) * 100)}%

## Executive Summary
${report.executiveSummary || ''}

## Recommendation
${report.recommendation || ''}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Research Results
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              View the final report once the research is completed.
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors hidden sm:inline-flex"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Empty State vs Rich Report */}
      {!report ? (
        <EmptyState
          icon={FileSearch}
          title="No report available yet"
          description="The agent is still working on your research. Check back later or view the live progress above."
          action={
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => completeResearch(selectedResearch.id)}
            >
              Simulate Instant Report Completion
            </Button>
          }
        />
      ) : (
        <div className="space-y-5 text-slate-800 dark:text-slate-200">
          {/* Metadata banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14203A]/50 border border-slate-200/90 dark:border-[#29364B] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {report.title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Generated: {report.generatedAt}
              </span>
              {report.confidenceScore !== undefined && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  {Math.round(report.confidenceScore * 100)}% Confidence
                </span>
              )}
            </div>
          </div>

          {/* Executive Summary */}
          {report.executiveSummary && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                Executive Summary
              </h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/40">
                {report.executiveSummary}
              </p>
            </div>
          )}

          {/* Comparison Table */}
          {report.comparisonTable && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Feature Comparison Matrix
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[#29364B]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#29364B]">
                    <tr>
                      {report.comparisonTable.headers.map((h, i) => (
                        <th key={i} className="px-3.5 py-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#29364B]">
                    {report.comparisonTable.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-3.5 py-2.5 ${
                              cIdx === 0
                                ? 'font-medium text-slate-900 dark:text-slate-100'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Sections */}
          {report.sections && report.sections.length > 0 && (
            <div className="space-y-3.5 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Detailed Findings
              </h3>
              {report.sections.map((section, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-[#29364B] bg-white dark:bg-[#111C30]"
                >
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                    {section.heading}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Conflicting Claims & Limitations */}
          {((report.conflicts && report.conflicts.length > 0) ||
            (report.limitations && report.limitations.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {report.conflicts && report.conflicts.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
                  <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Conflicting Claims Identified
                  </h4>
                  {report.conflicts.map((conf, cIdx) => (
                    <div key={cIdx} className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{conf.claim}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{conf.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {report.limitations && report.limitations.length > 0 && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#29364B] bg-slate-50/50 dark:bg-[#14203A]/40">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Research Limitations
                  </h4>
                  <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
                    {report.limitations.map((lim, lIdx) => (
                      <li key={lIdx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommendation Box */}
          {report.recommendation && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-1.5">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Final Agent Recommendation
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {report.recommendation}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
