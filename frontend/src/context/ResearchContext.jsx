import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_RESEARCHES, COMPLETED_AI_TOOLS_REPORT } from '../data/mockResearch';
import { api } from '../services/api';

const ResearchContext = createContext();

export function ResearchProvider({ children }) {
  const [researches, setResearches] = useState(() => {
    try {
      const saved = localStorage.getItem('research_agent_sessions');
      return saved ? JSON.parse(saved) : INITIAL_RESEARCHES;
    } catch {
      return INITIAL_RESEARCHES;
    }
  });

  const [selectedResearchId, setSelectedResearchId] = useState('673f2a1e4c9d');
  const [activeTab, setActiveTab] = useState('agent_activity');
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Check if live backend server is online
  useEffect(() => {
    api.getHealth().then((isHealthy) => setBackendAvailable(isHealthy));
    const interval = setInterval(() => {
      api.getHealth().then((isHealthy) => setBackendAvailable(isHealthy));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem('research_agent_sessions', JSON.stringify(researches));
    } catch (e) {
      console.error('Failed to persist research sessions:', e);
    }
  }, [researches]);

  const selectedResearch = researches.find((r) => r.id === selectedResearchId) || researches[0];

  // Quick stats calculation
  const quickStats = {
    total: researches.length,
    completed: researches.filter((r) => r.status === 'completed').length,
    inProgress: researches.filter((r) =>
      ['in_progress', 'queued', 'planning', 'researching', 'evaluating', 'generating_report'].includes(r.status)
    ).length,
    failed: researches.filter((r) => r.status === 'failed').length,
  };

  const selectResearch = (id) => {
    setSelectedResearchId(id);
  };

  const activeTimersRef = useRef({});

  const clearTimers = (id) => {
    if (activeTimersRef.current[id]) {
      if (Array.isArray(activeTimersRef.current[id])) {
        activeTimersRef.current[id].forEach(clearTimeout);
      } else {
        clearInterval(activeTimersRef.current[id]);
      }
      delete activeTimersRef.current[id];
    }
  };

  // Stop / cancel a research session
  const stopResearch = (id) => {
    clearTimers(id);
    setResearches((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedSteps = (item.activitySteps || []).map((s) =>
            s.status === 'in_progress' ? { ...s, status: 'failed', time: 'Stopped' } : s
          );
          return {
            ...item,
            status: 'failed',
            timeAgo: 'Just now',
            activitySteps: updatedSteps,
          };
        }
        return item;
      })
    );
  };

  // Complete simulation manually
  const completeResearch = (id) => {
    clearTimers(id);
    setResearches((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: 'completed',
            timeAgo: 'Just now',
            activitySteps: (item.activitySteps || []).map((step) => ({
              ...step,
              status: 'completed',
              time: 'Completed',
            })),
            tasks: (item.tasks || []).map((t) => ({ ...t, status: 'completed' })),
            report: item.report || COMPLETED_AI_TOOLS_REPORT,
          };
        }
        return item;
      })
    );
  };

  // Helper to map backend status to 4 activity timeline steps
  const mapStatusToSteps = (status, agentLog = []) => {
    const isStep1Done = ['researching', 'evaluating', 'generating_report', 'completed'].includes(status);
    const isStep1Active = status === 'planning';

    const isStep2Done = ['evaluating', 'generating_report', 'completed'].includes(status);
    const isStep2Active = status === 'researching';

    const isStep3Done = ['generating_report', 'completed'].includes(status);
    const isStep3Active = status === 'evaluating';

    const isStep4Done = status === 'completed';
    const isStep4Active = status === 'generating_report';

    return [
      {
        id: 1,
        title: 'Planning Research',
        description: isStep1Done
          ? 'Decomposed inquiry into targeted subtasks.'
          : isStep1Active
          ? 'Analyzing constraints and formulating subtask plan...'
          : 'Waiting for planning phase...',
        status: isStep1Done ? 'completed' : isStep1Active ? 'in_progress' : 'pending',
        time: isStep1Done ? 'Completed' : isStep1Active ? 'Just now' : 'Pending',
      },
      {
        id: 2,
        title: 'Searching Sources',
        description: isStep2Done
          ? 'Retrieved relevant facts and web documentation.'
          : isStep2Active
          ? 'Querying Tavily/DuckDuckGo for primary evidence...'
          : 'Pending search initiation',
        status: isStep2Done ? 'completed' : isStep2Active ? 'in_progress' : 'pending',
        time: isStep2Done ? 'Completed' : isStep2Active ? 'In progress' : 'Pending',
      },
      {
        id: 3,
        title: 'Evaluating Evidence',
        description: isStep3Done
          ? 'Assessed completeness, resolved gaps & audited citations.'
          : isStep3Active
          ? 'Analyzing evidence consistency and identifying potential conflicts...'
          : 'Pending evidence collection',
        status: isStep3Done ? 'completed' : isStep3Active ? 'in_progress' : 'pending',
        time: isStep3Done ? 'Completed' : isStep3Active ? 'In progress' : 'Pending',
      },
      {
        id: 4,
        title: 'Generating Report',
        description: isStep4Done
          ? 'Synthesized comprehensive report with verified references.'
          : isStep4Active
          ? 'Compiling findings, matrix table, and recommendations...'
          : 'Pending completion',
        status: isStep4Done ? 'completed' : isStep4Active ? 'in_progress' : 'pending',
        time: isStep4Done ? 'Completed' : isStep4Active ? 'In progress' : 'Pending',
      },
    ];
  };

  // Start new research session (auto-detects live backend vs mock simulation)
  const startNewResearch = async ({ question, constraints = {} }) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let title = question.slice(0, 36).trim();
    if (question.length > 36) title += '...';

    // ─────────────────────────────────────────────────────────────
    // PATH A: LIVE BACKEND API AVAILABLE
    // ─────────────────────────────────────────────────────────────
    try {
      const isOnline = await api.getHealth();
      if (isOnline) {
        const backendDoc = await api.createResearch({
          question,
          constraints: {
            deadline: constraints.deadline && constraints.deadline !== 'Not set' ? new Date(constraints.deadline) : undefined,
            budget: constraints.budget ? Number(constraints.budget) : undefined,
            preferredSourceTypes: constraints.preferredSourceTypes ? [constraints.preferredSourceTypes] : [],
            maxSources: constraints.maxSources ? Number(constraints.maxSources) : 10,
          },
        });

        const liveSession = {
          id: backendDoc._id,
          title,
          question,
          status: backendDoc.status || 'in_progress',
          createdAt: formattedDate,
          startedAt: formattedDate,
          updatedAt: formattedDate,
          timeAgo: 'Just now',
          constraints: {
            deadline: constraints.deadline || 'Not set',
            budget: constraints.budget ? `$${constraints.budget}` : 'Not set',
            preferredSourceTypes: constraints.preferredSourceTypes || 'Any source',
            maxSources: constraints.maxSources || '10',
          },
          activitySteps: mapStatusToSteps(backendDoc.status || 'planning'),
          tasks: [],
          evidence: [],
          toolCalls: [],
          report: null,
        };

        setResearches((prev) => [liveSession, ...prev]);
        setSelectedResearchId(backendDoc._id);
        setActiveTab('agent_activity');

        // Poll backend every 1.5 seconds until completed or failed
        const pollInterval = setInterval(async () => {
          try {
            const [researchData, tasks, evidence, toolCalls, report] = await Promise.all([
              api.getResearch(backendDoc._id),
              api.getTasks(backendDoc._id),
              api.getEvidence(backendDoc._id),
              api.getToolCalls(backendDoc._id),
              api.getReport(backendDoc._id).catch(() => null),
            ]);

            const isDone = researchData.status === 'completed' || researchData.status === 'failed';
            if (isDone) {
              clearInterval(pollInterval);
              delete activeTimersRef.current[backendDoc._id];
            }

            setResearches((prev) =>
              prev.map((item) => {
                if (item.id === backendDoc._id) {
                  return {
                    ...item,
                    status: researchData.status,
                    timeAgo: 'Updated live',
                    activitySteps: mapStatusToSteps(researchData.status, researchData.agentLog),
                    tasks: (tasks || []).map((t) => ({
                      id: t._id,
                      title: t.title,
                      description: t.description,
                      order: t.order,
                      status: t.status,
                    })),
                    evidence: (evidence || []).map((e) => ({
                      id: e._id,
                      title: e.title,
                      url: e.url,
                      domain: e.url ? new URL(e.url).hostname : 'source',
                      sourceType: e.sourceType,
                      snippet: e.snippet,
                      qualityScore: e.qualityScore,
                      retrievedAt: new Date(e.retrievedAt || Date.now()).toLocaleTimeString(),
                    })),
                    toolCalls: (toolCalls || []).map((tc) => ({
                      id: tc._id,
                      toolName: tc.toolName,
                      input: tc.input,
                      outputSummary: tc.outputSummary,
                      durationMs: tc.durationMs,
                      status: tc.status,
                    })),
                    report: report
                      ? {
                          title: report.title || `Research Report: ${title}`,
                          generatedAt: new Date(report.generatedAt || Date.now()).toLocaleDateString(),
                          confidenceScore: report.confidenceScore || 0.94,
                          executiveSummary: report.executiveSummary || '',
                          comparisonTable: report.comparisonTable,
                          sections: report.sections || [],
                          conflicts: report.conflicts || [],
                          limitations: report.limitations || [],
                          recommendation: report.recommendation || '',
                          markdown: report.markdown || '',
                        }
                      : null,
                  };
                }
                return item;
              })
            );
          } catch (pollErr) {
            console.warn('[live-poll] error:', pollErr.message);
          }
        }, 1500);

        activeTimersRef.current[backendDoc._id] = pollInterval;
        return backendDoc._id;
      }
    } catch (e) {
      console.log('Backend not detected, falling back to client-side mock simulation:', e.message);
    }

    // ─────────────────────────────────────────────────────────────
    // PATH B: FALLBACK TO CLIENT-SIDE MOCK (IF BACKEND OFFLINE)
    // ─────────────────────────────────────────────────────────────
    const newId = Math.random().toString(16).substring(2, 14);
    const newSession = {
      id: newId,
      title,
      question,
      status: 'in_progress',
      stage: 'planning',
      createdAt: formattedDate,
      startedAt: formattedDate,
      updatedAt: formattedDate,
      timeAgo: 'Just now',
      constraints: {
        deadline: constraints.deadline || 'Not set',
        budget: constraints.budget ? `$${constraints.budget}` : 'Not set',
        preferredSourceTypes: constraints.preferredSourceTypes || 'Any source',
        maxSources: constraints.maxSources || 'Not set',
      },
      activitySteps: [
        {
          id: 1,
          title: 'Planning Research',
          description: 'Breaking down the question into research subtasks...',
          status: 'in_progress',
          time: 'Just now',
        },
        {
          id: 2,
          title: 'Searching Sources',
          description: 'Searching the web for reliable sources and documentation...',
          status: 'pending',
          time: 'Pending',
        },
        {
          id: 3,
          title: 'Evaluating Evidence',
          description: 'Checking source reliability and identifying conflicts...',
          status: 'pending',
          time: 'Pending',
        },
        {
          id: 4,
          title: 'Generating Report',
          description: 'Creating a structured report with citations...',
          status: 'pending',
          time: 'Pending',
        },
      ],
      tasks: [
        {
          id: `t-${Date.now()}-1`,
          title: `Analyze requirements for "${title}"`,
          description: 'Decompose core objectives and criteria into discrete queries.',
          order: 1,
          status: 'in_progress',
        },
        {
          id: `t-${Date.now()}-2`,
          title: 'Gather primary sources & documentation',
          description: 'Retrieve technical documentation and cross-verify facts.',
          order: 2,
          status: 'pending',
        },
        {
          id: `t-${Date.now()}-3`,
          title: 'Extract claims and detect contradictions',
          description: 'Synthesize extracted evidence snippets into structured assertions.',
          order: 3,
          status: 'pending',
        },
        {
          id: `t-${Date.now()}-4`,
          title: 'Formulate final recommendation and report',
          description: 'Draft executive summary, comparison matrix, and confidence score.',
          order: 4,
          status: 'pending',
        },
      ],
      evidence: [
        {
          id: `ev-${Date.now()}-1`,
          title: `Preliminary Findings: ${title}`,
          url: 'https://example.org/research/findings',
          domain: 'example.org',
          sourceType: 'documentation',
          snippet: `Live research queries initialized. Collecting evidence for: "${question.slice(0, 100)}..."`,
          qualityScore: 0.92,
          retrievedAt: 'Just now',
        },
      ],
      toolCalls: [
        {
          id: `tc-${Date.now()}-1`,
          toolName: 'web_search',
          input: { query: question.slice(0, 80) },
          outputSummary: 'Discovered relevant documentation and analytical articles.',
          durationMs: 380,
          status: 'succeeded',
        },
      ],
      report: null,
    };

    setResearches((prev) => [newSession, ...prev]);
    setSelectedResearchId(newId);
    setActiveTab('agent_activity');

    const t1 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'searching',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id === 1) return { ...s, status: 'completed', time: '1s ago' };
                if (s.id === 2) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t) => (t.order === 1 ? { ...t, status: 'completed' } : t.order === 2 ? { ...t, status: 'in_progress' } : t)),
            };
          }
          return item;
        })
      );
    }, 3000);

    const t2 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'evaluating',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id === 2) return { ...s, status: 'completed', time: '4s ago' };
                if (s.id === 3) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t) => (t.order <= 2 ? { ...t, status: 'completed' } : t.order === 3 ? { ...t, status: 'in_progress' } : t)),
            };
          }
          return item;
        })
      );
    }, 7000);

    const t3 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'generating_report',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id === 3) return { ...s, status: 'completed', time: '8s ago' };
                if (s.id === 4) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t) => (t.order <= 3 ? { ...t, status: 'completed' } : t.order === 4 ? { ...t, status: 'in_progress' } : t)),
            };
          }
          return item;
        })
      );
    }, 12000);

    const t4 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              status: 'completed',
              stage: 'completed',
              timeAgo: 'Just now',
              activitySteps: item.activitySteps.map((s) => ({ ...s, status: 'completed', time: 'Completed' })),
              tasks: item.tasks.map((t) => ({ ...t, status: 'completed' })),
              report: COMPLETED_AI_TOOLS_REPORT,
            };
          }
          return item;
        })
      );
    }, 16000);

    activeTimersRef.current[newId] = [t1, t2, t3, t4];
    return newId;
  };

  const resetMockData = () => {
    Object.keys(activeTimersRef.current).forEach(clearTimers);
    setResearches(INITIAL_RESEARCHES);
    setSelectedResearchId('673f2a1e4c9d');
    localStorage.removeItem('research_agent_sessions');
  };

  return (
    <ResearchContext.Provider
      value={{
        researches,
        selectedResearchId,
        selectedResearch,
        activeTab,
        backendAvailable,
        setActiveTab,
        quickStats,
        selectResearch,
        startNewResearch,
        stopResearch,
        completeResearch,
        resetMockData,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
}
