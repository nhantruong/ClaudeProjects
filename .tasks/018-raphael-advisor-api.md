---
id: "018"
title: "Implement Raphael AI advisor (briefing + ask endpoints)"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-080", "FR-081", "FR-082", "FR-083", "FR-084", "FR-085"]
blocks: ["015"]
blocked_by: ["001", "003", "005", "009", "010"]
---

## Description

Implement the Raphael AI advisor service: a daily briefing endpoint and a natural language Q&A endpoint. The advisor assembles context from the database (overdue tasks, blocked tasks, critical priorities, team workload) and calls an external AI API server-side. The AI provider is an open question — resolve it before implementing. AI keys must never reach the client.

## Acceptance Criteria

- [x] Open Question #2 in PRD.md resolved: AI provider selected (Anthropic Claude API primary, Ollama fallback per ADR-003)
- [x] `GET /api/v1/advisor/briefing` — returns structured briefing: priorities array (top 5), alerts array (overdue/blocked), recommendations array (FR-081, FR-082, FR-084)
- [x] Each priority item includes: task title, project name, reason for priority (FR-085)
- [x] `POST /api/v1/advisor/ask` — accepts `{ question: string }`, returns `{ answer: string }` (FR-083)
- [x] All AI calls are server-side only — API key in env var, never exposed to client
- [x] Context assembled efficiently — no redundant queries; total context size reasonable (<4000 tokens)
- [x] Graceful error handling: if AI provider is unavailable, return a structured "advisor unavailable" response (not a 500)
- [x] Unit test for context assembly function (mock AI provider)
- [x] API.md updated

## Technical Notes

- Resolve Open Question #2 before starting. Anthropic Claude API recommended (available via `@anthropic-ai/sdk`)
- Context to include: active projects list, overdue tasks (with days overdue), blocked tasks (with blocker), tasks due today/tomorrow, last week's PPC per project
- For `/briefing`: use a system prompt that defines Raphael's advisor persona — decisive, concise, engineering-aware
- For `/ask`: include full context in system prompt, user question in user message
- Cache briefing for 1 hour to avoid hammering AI API on every dashboard load

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @backend-developer | Briefing + ask endpoints, ai.ts provider abstraction, 1h cache, graceful fallback, 12 unit tests passing. API.md updated. |
