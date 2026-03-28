---
id: "018"
title: "Implement Raphael AI advisor (briefing + ask endpoints)"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-080", "FR-081", "FR-082", "FR-083", "FR-084", "FR-085"]
blocks: ["015"]
blocked_by: ["001", "003", "005", "009", "010"]
---

## Description

Implement the Raphael AI advisor service: a daily briefing endpoint and a natural language Q&A endpoint. The advisor assembles context from the database (overdue tasks, blocked tasks, critical priorities, team workload) and calls an external AI API server-side. The AI provider is an open question — resolve it before implementing. AI keys must never reach the client.

## Acceptance Criteria

- [ ] Open Question #2 in PRD.md resolved: AI provider selected (OpenAI, Anthropic, or local Ollama)
- [ ] `GET /api/v1/advisor/briefing` — returns structured briefing: priorities array (top 5), alerts array (overdue/blocked), recommendations array (FR-081, FR-082, FR-084)
- [ ] Each priority item includes: task title, project name, reason for priority (FR-085)
- [ ] `POST /api/v1/advisor/ask` — accepts `{ question: string }`, returns `{ answer: string }` (FR-083)
- [ ] All AI calls are server-side only — API key in env var, never exposed to client
- [ ] Context assembled efficiently — no redundant queries; total context size reasonable (<4000 tokens)
- [ ] Graceful error handling: if AI provider is unavailable, return a structured "advisor unavailable" response (not a 500)
- [ ] Unit test for context assembly function (mock AI provider)
- [ ] API.md updated

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
