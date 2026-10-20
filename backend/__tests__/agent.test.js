/**
 * Agent brain unit tests.
 *
 * Deliberately DB-free and network-free so `npm test` runs offline:
 *  - rate limiter, JSON repair, provider resolution
 *  - planner output sanitisation + deterministic mock LLM behaviour
 *  - citation injection, markdown rendering, citation verification
 *  - DDG HTML parsing and source-type classification
 */

process.env.LLM_PROVIDER = 'mock';
process.env.TAVILY_API_KEY = '';

const { GapLimiter } = require('../src/agent/lib/rate-limiter');
const llm = require('../src/agent/llm/client');
const mock = require('../src/agent/llm/mock');
const { sanitiseSubtasks } = require('../src/agent/pipeline/planner');
const { clamp01 } = require('../src/agent/pipeline/researcher');
const { structuralGaps } = require('../src/agent/pipeline/reflector');
const { removeSentence } = require('../src/agent/pipeline/synthesizer');
const { verifyCitations } = require('../src/agent/pipeline/verifier');
const {
  extractCitationIndexes,
  injectCitations,
  stripCitations,
  buildMarkdown,
} = require('../src/agent/lib/citations');
const { classifySourceType } = require('../src/agent/lib/source-type');
const { parseResults, resolveUrl } = require('../src/agent/tools/duckduckgo');
const { evaluateRelevance, relaxQuery, strictQuery } = require('../src/agent/tools/wikipedia');

describe('GapLimiter', () => {
  it('serialises tasks and respects the minimum gap', async () => {
    const limiter = new GapLimiter({ minGapMs: 30, concurrency: 1 });
    const order = [];

    const start = Date.now();
    await Promise.all([
      limiter.schedule(async () => order.push('a')),
      limiter.schedule(async () => order.push('b')),
      limiter.schedule(async () => order.push('c')),
    ]);
    const elapsed = Date.now() - start;

    expect(order).toEqual(['a', 'b', 'c']);
    // two gaps of >= 30ms are required between three sequential starts
    expect(elapsed).toBeGreaterThanOrEqual(55);
  });

  it('propagates task rejections without stalling the queue', async () => {
    const limiter = new GapLimiter({ minGapMs: 0 });
    await expect(limiter.schedule(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limiter.schedule(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});

describe('LLM client', () => {
  it('resolves to the deterministic mock when no keys are configured', () => {
    expect(llm.resolveProvider()).toBe('mock');
  });

  it('parses JSON wrapped in code fences and surrounding prose', () => {
    expect(llm.parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(llm.parseJson('Sure! Here you go: {"b":[1,2]} hope that helps')).toEqual({ b: [1, 2] });
    expect(() => llm.parseJson('not json at all')).toThrow(/not valid JSON/);
  });

  it('unwraps a single-element array containing the requested object', () => {
    // Regression: a failed live run. Models often return `[{...}]` when asked
    // for `{...}`. The whole string parses first, so the object candidates were
    // never tried, callers read `data.sources` on an ARRAY and got `undefined`,
    // and every extracted source was discarded — ending in
    // "No evidence was collected". Silent data loss, no exception thrown.
    expect(llm.parseJson('[{"sources":[{"url":"https://x.com"}]}]')).toEqual({
      sources: [{ url: 'https://x.com' }],
    });
    expect(llm.parseJson('[{"subtasks":[{"title":"a"}]}]')).toEqual({ subtasks: [{ title: 'a' }] });
    // ...including when it is also fenced.
    expect(llm.parseJson('```json\n[{"sections":[]}]\n```')).toEqual({ sections: [] });
  });

  it('still returns genuine top-level arrays untouched', () => {
    // The planner accepts a bare array of subtasks, so multi-element arrays of
    // any length must NOT be unwrapped.
    expect(llm.parseJson('[{"title":"a"},{"title":"b"}]')).toEqual([{ title: 'a' }, { title: 'b' }]);
    expect(llm.parseJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('enforces the global call budget', async () => {
    llm.resetBudget();
    const before = llm.getCallsMade();
    expect(before).toBe(0);

    await llm.call({ purpose: 'plan', system: '', prompt: '', context: { question: 'x' } });
    expect(llm.getCallsMade()).toBe(1);
  });
});

describe('Planner sanitisation', () => {
  it('drops malformed subtasks and caps query counts', () => {
    const subtasks = sanitiseSubtasks(
      {
        subtasks: [
          { title: 'A', description: 'd', searchQueries: ['q1', 'q2', 'q3'] },
          { title: '', description: 'no title', searchQueries: ['q'] },
          { title: 'B', description: 'd', searchQueries: [] },
          { title: 'C', description: 'd', searchQueries: ['q'] },
        ],
      },
      'question'
    );

    expect(subtasks.map((s) => s.title)).toEqual(['A', 'C']);
    expect(subtasks[0].searchQueries).toHaveLength(2); // capped at 2 by config
  });

  it('falls back to a single direct subtask when the model returns nothing usable', () => {
    const subtasks = sanitiseSubtasks({ subtasks: [] }, 'What is Agentic AI?');
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].searchQueries[0]).toContain('Agentic AI');
  });
});

describe('Deterministic mock brain (offline mode)', () => {
  it('plans 3-4 subtasks with real search queries', async () => {
    const { data } = await llm.call({
      purpose: 'plan',
      system: '',
      prompt: '',
      context: { question: 'Compare LangChain and LlamaIndex for RAG' },
    });

    expect(data.subtasks.length).toBeGreaterThanOrEqual(3);
    expect(data.subtasks.length).toBeLessThanOrEqual(4);
    data.subtasks.forEach((subtask) => {
      expect(subtask.title).toBeTruthy();
      expect(subtask.searchQueries.length).toBeGreaterThan(0);
    });
  });

  it('extracts claims only from snippet text', async () => {
    const { data } = await llm.call({
      purpose: 'extract',
      system: '',
      prompt: '',
      context: {
        sources: [
          {
            url: 'https://example.com/a',
            snippet:
              'LangChain supports 70+ integrations as of 2026. It is maintained by LangChain Inc. and has 90k GitHub stars.',
            sourceType: 'documentation',
          },
          { url: 'https://example.com/empty', snippet: '', sourceType: 'other' },
        ],
      },
    });

    expect(data.sources[0].claims.length).toBeGreaterThan(0);
    expect(data.sources[0].claims[0].claim).toContain('LangChain');
    expect(data.sources[1].claims).toHaveLength(0);
  });

  it('anchors follow-up queries on the original question topic', async () => {
    const { data } = await llm.call({
      purpose: 'reflect',
      system: '',
      prompt: '',
      context: {
        question: 'Compare LangChain and LlamaIndex for building RAG pipelines',
        tasks: [{ _id: 't1', title: 'Investigate pricing and practical constraints', status: 'failed' }],
        evidence: [],
        minEvidencePerTask: 2,
      },
    });

    expect(data.followupQueries).toHaveLength(1);
    const query = data.followupQueries[0].query;
    expect(query).toContain('langchain'); // topic words from the question
    expect(query).not.toMatch(/evidence sources/); // no meta-word soup
  });

  it('keeps the angle words when the gap sits on a follow-up subtask', async () => {
    const { data } = await llm.call({
      purpose: 'reflect',
      system: '',
      prompt: '',
      context: {
        question: 'Compare LangChain and LlamaIndex for building RAG pipelines',
        tasks: [
          { _id: 't1', title: 'Follow-up: langchain llamaindex building independent benchmarks', status: 'pending' },
        ],
        evidence: [],
        minEvidencePerTask: 2,
      },
    });

    const query = data.followupQueries[0].query;
    expect(query).toContain('independent benchmarks'); // the subtask's actual angle
    expect(query).not.toMatch(/\bfollow\b/); // "Follow-up:" never leaks into the query
    expect(query).toContain('langchain'); // still anchored on the question
  });

  it('flags numeric contradictions between different sources', () => {
    const conflicts = mock.detectConflicts([
      {
        url: 'https://a.example.com',
        extractedFacts: [{ claim: 'The pro plan costs $20 per month for users' }],
      },
      {
        url: 'https://b.example.com',
        extractedFacts: [{ claim: 'The pro plan costs $25 per month for users' }],
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].description).toMatch(/Sources disagree/);
  });

  it('ignores identical claims from different sources', () => {
    const conflicts = mock.detectConflicts([
      { url: 'https://a.example.com', extractedFacts: [{ claim: 'The pro plan costs $20 per month' }] },
      { url: 'https://b.example.com', extractedFacts: [{ claim: 'The pro plan costs $20 per month' }] },
    ]);
    expect(conflicts).toHaveLength(0);
  });
});

describe('Structural gap detection', () => {
  it('reports subtasks below the evidence threshold', () => {
    const tasks = [{ _id: 't1' }, { _id: 't2' }];
    const gaps = structuralGaps(tasks, [{ taskId: 't1' }, { taskId: 't1' }, { taskId: 't2' }]);

    // t1 has 2 (ok), t2 has 1 (below the default minimum of 2)
    expect(gaps).toHaveLength(1);
    expect(gaps[0].taskId).toBe('t2');
  });
});

describe('Citations', () => {
  it('injects markers deterministically and extracts them back', () => {
    const content = injectCitations('Statement backed by two sources.', [3, 1, 1]);
    expect(content).toBe('Statement backed by two sources. [1] [3]');
    expect(extractCitationIndexes(content)).toEqual([1, 3]);
  });

  it('leaves uncited content untouched', () => {
    expect(injectCitations('No backing here.', [])).toBe('No backing here.');
  });

  it('strips specific citation markers', () => {
    expect(stripCitations('Claim [1] and claim [2] and claim [3].', [2])).toBe(
      'Claim [1] and claim and claim [3].'
    );
  });

  it('renders a complete markdown report with a references block', () => {
    const markdown = buildMarkdown({
      title: 'T',
      generatedAt: new Date('2026-01-01T00:00:00Z'),
      executiveSummary: 'Summary.',
      sections: [{ heading: 'S1', content: 'Body [1]' }],
      conflicts: [{ claim: 'C', description: 'D' }],
      limitations: ['L1'],
      recommendation: 'R',
      confidenceScore: 0.9,
      references: [{ index: 1, title: 'Source', url: 'https://x.example.com' }],
    });

    expect(markdown).toContain('# T');
    expect(markdown).toContain('## References');
    expect(markdown).toContain('[1] Source — https://x.example.com');
    expect(markdown).toContain('## Conflicting Claims Detected');
  });
});

describe('Citation verification (hallucination audit)', () => {
  const sections = [{ heading: 'S1', content: 'Claim A [1]', citationIndexes: [1] }];

  it('verifies a fully grounded report', () => {
    const result = verifyCitations({
      markdown: 'Claim A [1]',
      sections,
      references: [{ index: 1, evidenceId: 'ev1', title: 'T', url: 'https://x.example.com' }],
      validEvidenceIds: ['ev1'],
    });

    expect(result.verificationStatus).toBe('verified');
    expect(result.issues).toHaveLength(0);
    expect(result.citationCoverage).toBe(1);
  });

  it('strips dangling citations and demotes the report', () => {
    const result = verifyCitations({
      markdown: 'Claim A [1] Claim B [9]',
      sections,
      references: [{ index: 1, evidenceId: 'ev1', title: 'T', url: 'https://x.example.com' }],
      validEvidenceIds: ['ev1'],
    });

    expect(result.verificationStatus).toBe('needs_review');
    expect(result.markdown).not.toContain('[9]');
    expect(result.markdown).toContain('[1]');
    expect(result.issues.join(' ')).toMatch(/dangling/);
  });

  it('rejects references pointing at evidence from another session', () => {
    const result = verifyCitations({
      markdown: 'Claim A [1]',
      sections,
      references: [{ index: 1, evidenceId: 'foreign-evidence', title: 'T', url: 'https://x.example.com' }],
      validEvidenceIds: ['ev1'],
    });

    expect(result.verificationStatus).toBe('needs_review');
    expect(result.issues.join(' ')).toMatch(/does not resolve/);
    expect(result.citationCoverage).toBe(0);
  });
});

describe('Report cleanup helpers', () => {
  it('removes exactly the flagged sentence', () => {
    const text = 'First supported sentence. The flagged one here. Third supported sentence.';
    expect(removeSentence(text, 'The flagged one here.')).toBe(
      'First supported sentence. Third supported sentence.'
    );
  });

  it('clamps credibility scores into 0..1', () => {
    expect(clamp01(5)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01('nonsense', 0.4)).toBe(0.4);
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe('Model schema compatibility (regression: silently-stripped fields)', () => {
  // Mongoose drops unknown paths on save. Two real bugs of this kind were
  // caught by the E2E run: `citationIndexes` vanished from sections (so every
  // report read back as 0% citation coverage) — these tests pin the schema.
  const mongoose = require('mongoose');
  const Report = require('../src/models/report.model');
  const Research = require('../src/models/research.model');
  const Task = require('../src/models/task.model');

  it('keeps report citation metadata through a document round-trip', () => {
    const doc = new Report({
      researchId: new mongoose.Types.ObjectId(),
      title: 'T',
      sections: [
        {
          heading: 'H',
          content: 'Backed claim [1]',
          citationIndexes: [1],
          evidenceIds: [new mongoose.Types.ObjectId()],
        },
      ],
      references: [
        {
          index: 1,
          evidenceId: new mongoose.Types.ObjectId(),
          title: 'Source',
          url: 'https://x.example.com',
          sourceType: 'documentation',
        },
      ],
      comparisonTable: { headers: ['Dim', 'Value'], rows: [['Cost', 'Free']] },
      markdown: '# T\n\nBacked claim [1]',
      citationCoverage: 1,
      verificationStatus: 'verified',
    });

    const plain = doc.toObject();
    expect(plain.sections[0].citationIndexes).toEqual([1]);
    expect(plain.references[0].index).toBe(1);
    expect(plain.comparisonTable.headers).toEqual(['Dim', 'Value']);
    expect(plain.markdown).toContain('[1]');
  });

  it('keeps agent observability streams on Research', () => {
    const doc = new Research({
      question: 'Q?',
      agentLog: [{ level: 'warn', phase: 'evaluating', message: 'gap found' }],
      reflectionLog: [{ iteration: 1, gapsFound: 2, conflictsFound: 1, confidence: 0.4 }],
    });

    const plain = doc.toObject();
    expect(plain.agentLog[0].message).toBe('gap found');
    expect(plain.reflectionLog[0].gapsFound).toBe(2);
  });

  it('keeps follow-up subtask metadata on Task', () => {
    const parent = new mongoose.Types.ObjectId();
    const doc = new Task({
      researchId: new mongoose.Types.ObjectId(),
      title: 'Follow-up: pricing',
      order: 4,
      searchQueries: ['pricing free tier'],
      origin: 'followup',
      parentTaskId: parent,
      spawnedAtIteration: 2,
    });

    const plain = doc.toObject();
    expect(plain.searchQueries).toEqual(['pricing free tier']);
    expect(plain.origin).toBe('followup');
    expect(String(plain.parentTaskId)).toBe(String(parent));
    expect(plain.spawnedAtIteration).toBe(2);
  });
});

describe('Wikipedia relevance gate (fallback source quality)', () => {
  it('rejects an incidental keyword hit with a generic page', () => {
    // Regression: query "…practical constraints / core capabilities works
    // evidence sources" pulled up "Speed limits…" and "Epistemology", which
    // then became cited evidence in the report.
    const verdict = evaluateRelevance(
      'langchain llamaindex building core capabilities works',
      'Epistemology',
      'Epistemology is the study of knowledge and justified belief. Evidence sources and methods of inquiry.'
    );

    expect(verdict.titleMatches).toBe(0);
    expect(verdict.passes).toBe(false);
  });

  it('accepts a page whose title matches the query topic', () => {
    const verdict = evaluateRelevance(
      'langchain llamaindex rag overview',
      'LangChain',
      'LangChain is a framework...' // short body would fail the body-only bar
    );

    expect(verdict.titleMatches).toBeGreaterThanOrEqual(1);
    expect(verdict.passes).toBe(true);
  });

  it('accepts a body-only match only when most query terms appear', () => {
    const extract =
      'Retrieval augmented generation combines a retriever with a language model. Retrieval augmented generation pipelines fetch context before answering.';

    expect(evaluateRelevance('retrieval augmented generation', 'RAG systems', extract).passes).toBe(true);
    expect(
      evaluateRelevance('retrieval augmented generation pricing plans limits', 'RAG systems', extract).passes
    ).toBe(false);
  });

  it('relaxes a multi-topic query with OR so MediaWiki can match at all', () => {
    // Regression: `srsearch` ANDs every term, so this query returned 0 hits
    // and the whole fallback chain went home empty.
    expect(relaxQuery('langchain llamaindex building core capabilities')).toBe(
      'langchain OR llamaindex OR building'
    );
  });

  it('refuses a relaxation that would be a pointless repeat', () => {
    expect(relaxQuery('rag')).toBeNull(); // one term — identical to the strict pass
    expect(relaxQuery('what is the?')).toBeNull(); // nothing but stopwords
    expect(relaxQuery('')).toBeNull();
  });

  it('strips question scaffolding before the strict AND pass', () => {
    expect(strictQuery('What are the core capabilities of LangChain?')).toBe('core capabilities langchain');
    expect(strictQuery('')).toBe('');
  });
});

describe('DuckDuckGo HTML parsing', () => {
  const html = `
    <div class="result">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdocs.example.com%2Fagent&amp;rut=abc">Agent Docs</a>
      <a class="result__snippet">Learn how the agent loop works in practice.</a>
    </div>
    <div class="result">
      <a rel="nofollow" class="result__a" href="https://blog.example.com/post">A Blog Post</a>
      <a class="result__snippet">Some &lt;b&gt;bold&lt;/b&gt; snippet text.</a>
    </div>`;

  it('extracts titles, real URLs and snippets', () => {
    const results = parseResults(html, 5);

    expect(results).toHaveLength(2);
    expect(results[0].url).toBe('https://docs.example.com/agent');
    expect(results[0].title).toBe('Agent Docs');
    expect(results[1].snippet).toBe('Some bold snippet text.');
    expect(results[1].score).toBeLessThan(results[0].score); // rank decay
  });

  it('unwraps redirect URLs and falls back for direct links', () => {
    expect(resolveUrl('//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fx&rut=1')).toBe(
      'https://example.com/x'
    );
    expect(resolveUrl('https://direct.example.com/page')).toBe('https://direct.example.com/page');
  });

  it('ignores non-http junk links', () => {
    expect(parseResults('<a class="result__a" href="javascript:void(0)">x</a>', 5)).toHaveLength(0);
  });
});

describe('Source type classification', () => {
  it('classifies common source categories', () => {
    expect(classifySourceType('https://arxiv.org/abs/2401.0001')).toBe('academic');
    expect(classifySourceType('https://www.cs.cmu.edu/agents')).toBe('academic');
    expect(classifySourceType('https://docs.langchain.com/agents')).toBe('documentation');
    expect(classifySourceType('https://github.com/langchain-ai/langchain')).toBe('documentation');
    expect(classifySourceType('https://www.reuters.com/tech/story')).toBe('news');
    expect(classifySourceType('https://medium.com/@dev/post')).toBe('blog');
    expect(classifySourceType('https://reddit.com/r/programming')).toBe('forum');
    expect(classifySourceType('https://random-site.example/page')).toBe('other');
  });
});
