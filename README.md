# Raphael

> AI-powered project and task management system for engineering teams — Kanban, Gantt, Lean construction, and an intelligent advisor that tells you what to do next.

---

## Overview

Raphael is a unified workspace designed for small engineering teams working across multiple disciplines — electromechanical engineering, BIM management, and software development. Named after the Great Sage advisor from *That Time I Got Reincarnated as a Slime*, it acts as an always-on intelligent advisor that keeps your team focused on the right work at the right time.

Without Raphael, engineering teams juggle tasks across disconnected tools — spreadsheets, whiteboards, chat threads — with no single source of truth and no system to surface what actually needs attention. Raphael solves this by combining Kanban boards, Gantt charts, Lean construction workflows (Last Planner System), and an AI advisor into one domain-aware platform.

The system is built for daily use by the project owner and their small team, running on their own infrastructure (local and remote server).

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite, TypeScript | SPA with responsive layout |
| Styling | Tailwind CSS | Utility-first, mobile-first |
| Backend | Node.js 20 + Express, TypeScript | MVC pattern |
| Database | MS SQL Server | Raw SQL via `mssql` driver |
| Auth | JWT in httpOnly cookie | Stateless, XSS-safe (ADR-002) |
| AI Advisor | Claude API + Ollama | Switchable via AI_PROVIDER env var (ADR-003) |
| Hosting | Local dev + 103.27.60.66 | Self-hosted |
| CI/CD | [TBD] | |

---

## Getting Started

### Prerequisites

- Node.js 20.x LTS (see `.nvmrc`)
- npm 10+
- MS SQL Server (local instance or connection to remote)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/[org]/raphael.git
cd raphael

# Install all dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local and fill in required values
```

### Running Locally

```bash
# Start both client and server in development mode
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Running Tests

```bash
# Unit tests (Vitest)
npm test

# E2E tests (requires dev server running)
npm run test:e2e

# Type checking
npm run typecheck
```

---

## Project Structure

```
raphael/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # Shared UI components
│       ├── features/        # Feature modules (kanban, gantt, dashboard, etc.)
│       ├── pages/           # Route-level pages
│       └── lib/             # Utilities, hooks, API client
├── server/                  # Node.js + Express backend
│   └── src/
│       ├── controllers/     # Route controllers
│       ├── services/        # Business logic
│       ├── models/          # SQL query functions
│       ├── middleware/       # Auth, validation, error handling
│       └── routes/          # Express routers
├── tests/
│   └── e2e/                 # Playwright E2E tests
├── docs/
│   ├── user/                # User-facing documentation
│   └── technical/           # Architecture, API, database, decisions
├── PRD.md                   # Product requirements (source of truth)
├── TODO.md                  # Project backlog
└── CLAUDE.md                # Claude AI instructions
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_SERVER` | Yes | MS SQL Server hostname or IP |
| `DB_PORT` | Yes | SQL Server port (default 1433) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `SESSION_SECRET` | Yes | Secret key for session signing |
| `AI_API_KEY` | Yes | Anthropic API key (when AI_PROVIDER=anthropic) |
| `AI_PROVIDER` | Yes | AI provider: `anthropic` (default) or `ollama` |
| `OLLAMA_URL` | No | Ollama base URL (when AI_PROVIDER=ollama, default http://localhost:11434) |
| `PORT` | No | Server port (default 3001) |
| `CLIENT_URL` | No | Frontend URL for CORS (default http://localhost:5173) |

See `.env.example` for all available variables.

---

## Deployment

The application is self-hosted. Deploy to the remote server at `103.27.60.66`.

```bash
# Production build
npm run build

# Start production server
npm start
```

---

## License

Proprietary — all rights reserved.
