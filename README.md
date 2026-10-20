# Autonomous Research Agent (MERN Stack)

A modern, modular SaaS dashboard and REST API backend for an **Autonomous Research Agent**. The application allows users to submit research questions, configure constraints, monitor agent activity across multi-step execution lifecycles, inspect evidence and developer tool calls, identify conflicting claims, and review structured reports with confidence scoring and citations.

---

## Architecture Overview

```
autonomous-research-agent/
├── backend/                  # Node.js + Express + Mongoose + Zod API
│   ├── src/
│   │   ├── config/           # MongoDB Atlas connection & graceful shutdown
│   │   ├── controllers/      # Research, Task, and Report controllers
│   │   ├── middlewares/      # Zod validator, 404 handler, centralized error handler
│   │   ├── models/           # Mongoose models (Research, Task, Evidence, ToolCall, Report)
│   │   ├── routes/           # REST endpoints under /api/v1
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # Cascade delete, transactions, agent launch hook
│   │   ├── agent/            # ★ The Agent Brain — autonomous research loop
│   │   │   ├── agent.service.js   # State machine: queued → planning → researching ⇄ evaluating → generating_report → completed|failed
│   │   │   ├── config.js          # All loop bounds, rate limits and provider settings
│   │   │   ├── llm/               # Provider chain: gemini → openai → deterministic mock
│   │   │   ├── tools/             # Search chain: tavily → duckduckgo → wikipedia
│   │   │   ├── pipeline/          # planner, researcher, reflector, synthesizer, verifier
│   │   │   └── lib/               # Citation injection, rate limiter, trace log, source typing
│   │   └── utils/            # Operational ApiError class
│   └── __tests__/            # Jest + Supertest suites (45 agent tests, offline)
│
├── frontend/                 # React 18 + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Header, DashboardLayout
│   │   │   ├── research/     # ResearchForm, ActivityTimeline, TaskList, EvidenceList, ToolCallList, ReportViewer
│   │   │   ├── dashboard/    # QuickStats, RecentResearches, ResearchDetails
│   │   │   └── ui/           # Button, Card, Badge, EmptyState, ThemeToggle
│   │   ├── context/          # ThemeContext (Light, Dark, System) & ResearchContext (live API + mock fallback)
│   │   ├── data/             # Realistic mock research sessions & reports
│   │   ├── services/         # api.js — the live backend client
│   │   └── pages/            # Home, NewResearch, MyResearches, Reports, Settings
│   └── dist/                 # Production build bundle
│
├── research/                 # ★ STANDALONE Python reference implementation
│   ├── search.py             # Live web search via Tavily (or mock mode)
│   ├── evidence.py           # Evidence collection, dedup, persistence
│   ├── verification.py       # Citation checks, uncited-claim flagging, conflict heuristic
│   ├── demo.py               # Runnable end-to-end demonstration
│   └── tests/                # pytest suites (95 tests passing)
│
├── requirements.txt          # Python deps for the `research/` package only
└── README.md
```

> **Note on the two `research/` directories** — they are unrelated, and the name
> collision is worth knowing about up front:
> - `frontend/src/components/research/` — React components for the dashboard.
> - `research/` (repo root) — a standalone **Python** package (Role 2: Research &
>   Evidence). It is *not* imported by the backend and is *not* on any runtime
>   path. See [§4](#4-the-research-package-standalone-reference-implementation)
>   for why it is kept separate.

---

## 1. Frontend Dashboard

### Key Features
- **Design Reference Match**: Faithfully recreates the layout, dark navy vertical sidebar (`#0A1128`), and two-column SaaS workspace.
- **Dark & Light Themes**: Full theme support (Light `#F5F8FC`, Dark `#0B1120`, System default). Persisted in `localStorage` with zero flicker on initial load.
- **Live backend integration**: `src/services/api.js` drives real sessions — health check, create, and a 1.5s poll of `GET /research/:id/activity` until the run finishes. Falls back to the local mock simulation when the API is unreachable, so the UI still demos standalone.
- **Card 1 — Start a New Research**: Multi-line question textarea with pre-filled collegiate hackathon query, optional deadline picker, budget input, preferred source dropdown, and validation.
- **Card 2 — Current Research Activity**:
  - Visual status badge (`In Progress`, `Completed`, `Failed`).
  - Interactive tabs: **Agent Activity**, **Tasks**, **Evidence**, **Tool Calls**, and **Report**.
  - Vertical 4-step workflow timeline driven by the agent's real phase transitions: Planning Research → Searching Sources → Evaluating Evidence → Generating Report.
  - Interactive controls: `Finish Mock` (fast-forwards the *offline fallback* only) and `Stop` (cancels session).
- **Card 3 — Research Results**:
  - Centered empty state illustration when report is pending.
  - Full report view upon completion: Executive summary, feature comparison matrix table, detailed findings, conflicting claims callout, research limitations, and final recommendation with confidence rating.
  - One-click copy markdown and print/export formatting.
- **Right Sidebar**:
  - **Quick Stats**: 2×2 grid showing Total Researches, Completed, In Progress, and Failed.
  - **Recent Researches**: Interactive list of top 5 sessions with active selection and status badges.
  - **Research Details**: Session metadata (`#id`, timestamps) and constraints summary.
- **Additional Pages**:
  - `/new-research`: Dedicated submission form with quick template suggestions.
  - `/my-researches`: Filterable by status (`All`, `In Progress`, `Completed`, `Failed`), searchable, and paginated.
  - `/reports`: Archive of completed reports with Markdown export.
  - `/settings`: Appearance switcher, default research preferences, and mock data factory reset.

### Running the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server (http://localhost:5173)
npm run dev

# Build production bundle
npm run build

# Preview production build (http://localhost:4173)
npm run preview
```

---

## 2. Backend REST API

### Key Features
- Express API with CommonJS modular architecture.
- Mongoose models for `Research`, `Task`, `Evidence`, `ToolCall`, and `Report` with indexes and timestamps.
- **Autonomous agent brain** (`src/agent/`) driving the full loop: decompose → search → extract → reflect → synthesise → verify.
- **Self-directed re-planning**: audits collected evidence for gaps and contradictions, then spawns its own follow-up searches instead of stopping at the first answer.
- **Engineered graceful degradation**: Gemini → OpenAI → deterministic offline mock for the LLM, and Tavily → DuckDuckGo → Wikipedia for search, so free-tier quotas, missing keys and flaky Wi-Fi never crash a run.
- **Hard loop bounds**: max iterations, max tasks, max LLM calls, source budget and per-provider rate limiters — no infinite loops.
- **Code-side citation injection**: the model returns evidence indexes and the agent renders `[n]`; citation coverage is audited before a report is marked verified.
- Robust cascade deletion using MongoDB transactions where available with standalone fallback.
- Centralized error handling (`ApiError`, Mongoose validation, CastErrors, duplicate key errors).
- Zod request validation rejecting invalid types and bad MongoDB ObjectIds with HTTP 400.
- CORS, Helmet HTTP headers, Morgan request logger, and Cookie Parser.
- DB-independent Jest + Supertest automated testing suite.

### Backend Setup & Running

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Required: MONGO_URI
# Optional but recommended: GEMINI_API_KEY (free tier) and TAVILY_API_KEY.
# Without keys the agent still runs end-to-end on DuckDuckGo/Wikipedia and the
# deterministic mock brain — it just produces a less rich report.

# Run automated tests (45 agent tests, fully offline)
npm test

# Run development server with Nodemon (http://localhost:5000)
npm run dev

# Run production server
npm start
```

### Environment Variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `5000` — **must match** `frontend/src/services/api.js`) |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `MONGO_URI` | **Yes** | MongoDB connection string (e.g. MongoDB Atlas). Server hard-exits without it. |
| `LLM_PROVIDER` | No | `auto` (default) \| `gemini` \| `openai` \| `mock` |
| `GEMINI_API_KEY` | No | Google Gemini key — primary LLM ([aistudio.google.com/apikey](https://aistudio.google.com/apikey), free tier) |
| `GEMINI_MODEL` | No | Default `gemini-3.1-flash-lite` (verified working). **`gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` and `gemini-3-pro-preview` are retired (404).** |
| `OPENAI_API_KEY` | No | Fallback LLM. Model `gpt-4o-mini`. |
| `TAVILY_API_KEY` | No | Primary search ([app.tavily.com](https://app.tavily.com/), free tier). Without it the agent uses keyless DuckDuckGo → Wikipedia. |
| `AGENT_ENABLED` | No | `true` (default) starts the agent on session create; `false` creates idle sessions |
| `AGENT_LLM_MIN_INTERVAL_MS` | No | LLM pacing (default `400`). Only throttle this if you are hitting *per-minute* limits — it cannot help against the daily cap described in §5. |
| `AGENT_DDG_MIN_INTERVAL_MS` | No | DuckDuckGo pacing (default `1500`) — it throttles hard below this |
| `AGENT_MAX_ITERATIONS` | No | Hard loop bound (default `3`) |
| `AGENT_MAX_TASKS` | No | Hard subtask bound (default `8`) |
| `AGENT_MAX_LLM_CALLS` | No | Hard LLM-call budget (default `40`) |
| `AGENT_DEFAULT_MAX_SOURCES` | No | Source budget per run (default `12`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default `*`) |
| `JWT_SECRET` | No | Reserved for future auth |

See `backend/.env.example` for the full annotated list.

---

## 3. API Endpoints (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service uptime and status |
| `POST` | `/api/v1/research` | Create new research session (starts in `queued`) |
| `GET` | `/api/v1/research` | Paginated research sessions (`?page=1&limit=10&status=...`) |
| `GET` | `/api/v1/research/:id` | Fetch single session by MongoDB ObjectId |
| `DELETE` | `/api/v1/research/:id` | Cascade delete session and all associated documents |
| `GET` | `/api/v1/research/:researchId/tasks` | Get tasks sorted by `order` |
| `POST` | `/api/v1/research/:researchId/tasks` | Manually insert a subtask record |
| `GET` | `/api/v1/research/:researchId/evidence` | Get evidence records (`?sourceType=...`) |
| `POST` | `/api/v1/research/:researchId/evidence` | Manually insert an evidence record |
| `GET` | `/api/v1/research/:researchId/tool-calls` | Get tool execution logs (`?status=...&toolName=...`) |
| `POST` | `/api/v1/research/:researchId/tool-calls` | Record tool execution log |
| `GET` | `/api/v1/research/:researchId/report` | Fetch research report |
| `PUT` | `/api/v1/research/:researchId/report` | Upsert research report with verified evidence references |

---

## 4. The `research/` Package (standalone reference implementation)

The repo-root `research/` directory is a **self-contained Python package** (Role 2:
Research & Evidence). It provides `search_web`, `EvidenceStore` and
`verify_citations`, and ships with **95 passing pytest tests**.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt     # tavily-python, python-dotenv, pytest, pytest-mock
python -m pytest research/tests/ -q # 95 passed
python research/demo.py             # runnable end-to-end demonstration
```

**It is deliberately not wired into the backend, and that is a design decision,
not an oversight:**

1. **It would import a second runtime into a working system.** Consuming it from
   the Node backend means a Python subprocess, a second dependency tree and a new
   class of failure (missing venv, wrong interpreter). The agent currently starts
   with `npm start` alone — a robustness property that matters more than code reuse.
2. **The Node agent already implements this layer, with stronger signals.** Search,
   evidence collection and citation verification all live in `backend/src/agent/`,
   driven by real LLM extraction and audit passes.
3. **Its own docs mark it as approximate.** `verification.py` states plainly that
   `find_conflicting_claims` "uses keyword overlap… It cannot determine whether"
   two claims genuinely conflict. It is an honest heuristic — useful as an
   independent cross-check, not as a replacement for the agent's fact-level
   contradiction detection.
4. **Its value is independence.** Two implementations of search/evidence/citation
   logic in two languages, both under test, corroborate each other. For a project
   judged on hallucination auditing, that is a stronger claim than a single
   code path — the same reason the agent corroborates web sources against Wikipedia.

If the team later wants the Python conflict heuristic as an *optional cross-check*,
it should be invoked off the critical path and skipped gracefully when Python or
its deps are unavailable.

---

## 5. Current Status & Disclaimers

- **Agent brain: implemented and verified.** The backend runs the full autonomous
  loop against live providers (Gemini + Tavily) and produces citation-audited
  Markdown reports. `npm test` covers it with 45 offline tests.
- **Frontend: live-wired with mock fallback.** `frontend/src/services/api.js` calls
  the real API, polls `GET /research/:id/activity` every 1.5s, and renders live
  tasks/evidence/tool calls/report. If `GET /health` fails it falls back to the
  local mock simulation, so the UI still demos without a backend. **Note:** the
  backend defaults to port `5000` to match this client — if you change one, change
  both, or the fallback will trigger silently and you will be looking at mock data.
- **Free-tier quota is the practical ceiling — and it is a *daily* cap, not a
  per-minute one.** `gemini-3-flash-preview` allows **20 requests per day**; a full
  run needs ~15–20 calls, so a single run can consume the entire daily allowance and
  then 429 for the next ~24h. Throttling with `AGENT_LLM_MIN_INTERVAL_MS` does not
  help against a daily cap. `gemini-3.1-flash-lite` has its own separate quota,
  works with JSON mode, and is the recommended default. When any provider 429s, the
  agent degrades the remaining calls to the deterministic mock and states so in the
  report's `## Limitations` — a run that says *"Generated in deterministic offline
  mode"* had a live search but a fallback brain; a clean run reports `verified`.
- **Retired models (verified 2026-10-20, all 404).** `gemini-2.0-flash`,
  `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-pro-preview`.
  **Working:** `gemini-3.1-flash-lite`, `gemini-flash-latest`,
  `gemini-3.1-flash-lite-preview`, and `gemini-3-flash-preview` (subject to the
  20/day cap above).
- **Python `research/` package: standalone.** 95 tests passing; intentionally not
  on any runtime path (see §4).
- **No vector search / embeddings pipeline** is in place — retrieval is live web
  search plus Wikipedia corroboration.
