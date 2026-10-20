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
│   │   ├── services/         # Cascade delete, transactions, agent placeholder
│   │   └── utils/            # Operational ApiError class
│   └── __tests__/            # Jest + Supertest test suite (9 tests passing)
│
├── frontend/                 # React 18 + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Header, DashboardLayout
│   │   │   ├── research/     # ResearchForm, ActivityTimeline, TaskList, EvidenceList, ToolCallList, ReportViewer
│   │   │   ├── dashboard/    # QuickStats, RecentResearches, ResearchDetails
│   │   │   └── ui/           # Button, Card, Badge, EmptyState, ThemeToggle
│   │   ├── context/          # ThemeContext (Light, Dark, System) & ResearchContext (Mock state & simulation)
│   │   ├── data/             # Realistic mock research sessions & reports
│   │   └── pages/            # Home, NewResearch, MyResearches, Reports, Settings
│   └── dist/                 # Production build bundle
└── README.md
```

---

## 1. Frontend Dashboard

### Key Features
- **Design Reference Match**: Faithfully recreates the layout, dark navy vertical sidebar (`#0A1128`), and two-column SaaS workspace.
- **Dark & Light Themes**: Full theme support (Light `#F5F8FC`, Dark `#0B1120`, System default). Persisted in `localStorage` with zero flicker on initial load.
- **Card 1 — Start a New Research**: Multi-line question textarea with pre-filled collegiate hackathon query, optional deadline picker, budget input, preferred source dropdown, and validation.
- **Card 2 — Current Research Activity**:
  - Visual status badge (`In Progress`, `Completed`, `Failed`).
  - Interactive tabs: **Agent Activity**, **Tasks**, **Evidence**, **Tool Calls**, and **Report**.
  - Vertical 4-step workflow timeline: Planning Research → Searching Sources → Evaluating Evidence → Generating Report.
  - Interactive controls: `Finish Mock` (fast-forwards simulation) and `Stop` (cancels session).
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
# Set MONGO_URI in .env

# Run automated tests (9 tests)
npm test

# Run development server with Nodemon (http://localhost:5000)
npm run dev

# Run production server
npm start
```

### Environment Variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `5000`) |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `MONGO_URI` | **Yes** | MongoDB connection string (e.g. MongoDB Atlas) |
| `GEMINI_API_KEY` | No* | Google Gemini API key (placeholder for future AI agent) |
| `OPENAI_API_KEY` | No* | OpenAI API key (placeholder for future AI agent) |
| `FRONTEND_URL` | No | Allowed CORS origin (default `*`) |
| `JWT_SECRET` | No* | JWT secret (placeholder for future auth) |

*\*Not required during current prototype phase.*

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

## 4. Current Status & Disclaimers

- **Frontend Simulation**: Operates standalone with realistic mock data and timed lifecycle simulation (`queued` → `planning` → `researching` → `evaluating` → `generating_report` → `completed`).
- **AI Agent Integration**: All endpoints and service hooks are ready for AI agent integration. No live LLM inference, autonomous web scraping, or vector search pipelines are active yet.
