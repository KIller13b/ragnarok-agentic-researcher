import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  Calendar,
  ExternalLink,
  BookOpen,
  Award
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useResearch } from '../context/ResearchContext';

export default function Reports() {
  const { researches } = useResearch();

  // Find all researches that have a completed report
  const completedReports = researches.filter((r) => r.report);
  const [selectedReportId, setSelectedReportId] = useState(
    completedReports[0]?.id || null
  );
  const [copied, setCopied] = useState(false);

  const activeSession = researches.find((r) => r.id === selectedReportId) || completedReports[0];
  const activeReport = activeSession?.report;

  const handleCopy = (report) => {
    if (!report) return;
    const text = `
# ${report.title}
Generated: ${report.generatedAt}
Confidence Score: ${Math.round((report.confidenceScore || 0.9) * 100)}%

## Executive Summary
${report.executiveSummary || ''}

## Recommendation
${report.recommendation || ''}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Generated Research Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access, review, and export synthesized reports with citations and recommendation scoring.
          </p>
        </div>
      </div>

      {completedReports.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No completed reports yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Run a research session on the Home dashboard or use the "Finish Mock" button to complete a simulation.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Report Selector List (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Reports ({completedReports.length})
            </h3>
            {completedReports.map((session) => {
              const isSelected = session.id === activeSession?.id;
              return (
                <Card
                  key={session.id}
                  onClick={() => setSelectedReportId(session.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/10'
                      : 'hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {session.report?.title || session.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Generated {session.report?.generatedAt || session.updatedAt}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                          {Math.round((session.report?.confidenceScore || 0.9) * 100)}% Confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Report Viewer (Right 8 cols) */}
          <div className="lg:col-span-8">
            {activeReport ? (
              <Card className="p-6 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/90 dark:border-[#29364B]">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {activeReport.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Inquiry: "{activeSession.question}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(activeReport)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Executive Summary */}
                {activeReport.executiveSummary && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      Executive Summary
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/40">
                      {activeReport.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Comparison Matrix */}
                {activeReport.comparisonTable && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Synthesis Matrix
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[#29364B]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#29364B]">
                          <tr>
                            {activeReport.comparisonTable.headers.map((h, i) => (
                              <th key={i} className="px-3.5 py-2.5 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#29364B]">
                          {activeReport.comparisonTable.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
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

                {/* Sections */}
                {activeReport.sections && activeReport.sections.map((section, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200/80 dark:border-[#29364B]">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                      {section.heading}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}

                {/* Recommendation */}
                {activeReport.recommendation && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-1.5">
                      <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Final Recommendation
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                      {activeReport.recommendation}
                    </p>
                  </div>
                )}
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
