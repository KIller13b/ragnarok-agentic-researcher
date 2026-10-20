import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_RESEARCHES, COMPLETED_AI_TOOLS_REPORT } from '../data/mockResearch';

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
  const [activeTab, setActiveTab] = useState('agent_activity'); // 'agent_activity', 'tasks', 'evidence', 'tool_calls', 'report'

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

  // Select research session
  const selectResearch = (id) => {
    setSelectedResearchId(id);
  };

  const activeTimersRef = useRef({});

  const clearTimers = (id) => {
    if (activeTimersRef.current[id]) {
      activeTimersRef.current[id].forEach(clearTimeout);
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

  // Helper to complete a research session with mock report
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

  // Start new mock research session
  const startNewResearch = ({ question, constraints = {} }) => {
    const newId = Math.random().toString(16).substring(2, 14);
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Derive a clean title from the question
    let title = question.slice(0, 36).trim();
    if (question.length > 36) title += '...';

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

    // Simulate lifecycle progress with timers
    // Step 1 -> Step 2 after 3s
    const t1 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'searching',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id === 1) return { ...s, status: 'completed', time: '1m ago' };
                if (s.id === 2) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t, idx) =>
                idx === 0 ? { ...t, status: 'completed' } : idx === 1 ? { ...t, status: 'in_progress' } : t
              ),
            };
          }
          return item;
        })
      );
    }, 3000);

    // Step 2 -> Step 3 after 7s
    const t2 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'evaluating',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id === 1) return { ...s, status: 'completed' };
                if (s.id === 2) return { ...s, status: 'completed', time: '1m ago' };
                if (s.id === 3) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t, idx) =>
                idx <= 1 ? { ...t, status: 'completed' } : idx === 2 ? { ...t, status: 'in_progress' } : t
              ),
            };
          }
          return item;
        })
      );
    }, 7000);

    // Step 3 -> Step 4 after 12s
    const t3 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              stage: 'generating_report',
              activitySteps: item.activitySteps.map((s) => {
                if (s.id <= 2) return { ...s, status: 'completed' };
                if (s.id === 3) return { ...s, status: 'completed', time: '1m ago' };
                if (s.id === 4) return { ...s, status: 'in_progress', time: 'Just now' };
                return s;
              }),
              tasks: item.tasks.map((t, idx) =>
                idx <= 2 ? { ...t, status: 'completed' } : { ...t, status: 'in_progress' }
              ),
            };
          }
          return item;
        })
      );
    }, 12000);

    // Completion after 16s
    const t4 = setTimeout(() => {
      setResearches((prev) =>
        prev.map((item) => {
          if (item.id === newId && item.status === 'in_progress') {
            return {
              ...item,
              status: 'completed',
              stage: 'completed',
              timeAgo: 'Just now',
              activitySteps: item.activitySteps.map((s) => ({
                ...s,
                status: 'completed',
                time: 'Completed',
              })),
              tasks: item.tasks.map((t) => ({ ...t, status: 'completed' })),
              report: {
                title: `Comprehensive Research Report: ${title}`,
                generatedAt: 'Just now',
                confidenceScore: 0.94,
                verificationStatus: 'verified',
                executiveSummary: `This synthesized report answers the research inquiry: "${question}". Primary documentation and technical benchmarks were analyzed to formulate a definitive, evidence-backed finding for your constraints.`,
                comparisonTable: {
                  headers: ['Dimension', 'Primary Assessment', 'Benchmark Grade', 'Key Consideration'],
                  rows: [
                    ['Capability & Features', 'Meets or exceeds all requested functional requirements', 'Grade A', 'Extensive language and tooling compatibility'],
                    ['Operational Overhead', 'Zero unexpected subscription or licensing roadblocks', 'Grade A+', 'Instant onboarding without approval wait times'],
                    ['Network & Resilience', 'Standard web socket / HTTPS communication protocol', 'Grade B+', 'Requires reliable internet connectivity during generation'],
                    ['Quality & Verification', 'Verified against primary documentation and developer consensus', 'Grade A', '94% high-confidence evidence alignment']
                  ]
                },
                sections: [
                  {
                    heading: '1. Executive Evaluation & Core Findings',
                    content: 'Based on our autonomous evaluation across available documentation and peer review metrics, the analyzed options provide distinct tradeoffs between setup speed and deep ecosystem lock-in. For beginners and rapid turnaround environments, streamlined authentication and transparent zero-cost tiers dramatically reduce initial friction.'
                  },
                  {
                    heading: '2. Constraint Verification & Limitations',
                    content: 'All constraints specified in the query were cross-verified. Edge case handling under intermittent connectivity remains an industry-wide challenge, but lightweight client payloads help preserve responsiveness.'
                  }
                ],
                conflicts: [
                  {
                    claim: 'Marketing Claims vs Practical Availability',
                    description: 'Identified slight discrepancies in third-party marketing regarding offline execution vs server-dependent inference.'
                  }
                ],
                limitations: [
                  'Synthetic evaluation conducted with mock simulation tools for frontend validation.',
                  'Real-time pricing or terms of service may fluctuate based on provider policy updates.'
                ],
                recommendation: 'Adopt the top-ranked alternative for immediate implementation. It provides the strongest balance of zero-cost accessibility, high developer sentiment, and rapid time-to-value.'
              }
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
