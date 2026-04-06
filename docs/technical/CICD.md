# CI/CD and Deployment

> Last updated: 2026-04-06
> Version: 0.1.0

---

## Overview

Raphael is deployed manually to a Plesk Obsidian server at `rasphael.cbimtech.com` (IP: 103.27.60.66). Deployments are performed by uploading built artifacts via the Plesk File Manager and configuring the Node.js app through the Plesk Node.js extension.

A GitHub Actions CI pipeline (`ci.yml`) and PR title check (`pr-title-check.yml`) are now implemented. Automated deployment (SSH to Plesk) is planned for a future task once the team confirms SSH access to the server.

---

## Environments

| Environment | URL | Branch | Deploy method |
|-------------|-----|--------|---------------|
| Production | http://rasphael.cbimtech.com | `main` | Manual — Plesk File Manager + Node.js extension |
| Local dev | http://localhost:5173 (client) / :3001 (API) | any | `npm run dev` |

---

## Manual Deployment to Plesk (Production)

### Prerequisites

- Access to Plesk Obsidian control panel at `103.27.60.66`
- Node.js 16.20.2 available on the server (managed by Plesk Node.js extension)
- MS SQL Server accessible from the server at `CTC-COM-6996:1433`
- The `.env` file contents (see "Production Environment Variables" below)

### Node.js Version Note

The Plesk server runs Node.js 16.20.2. The server code targets Node 20 LTS but is fully compatible with Node 16 with one exception: the `callOllama()` function in `server/dist/lib/ai.js` uses the global `fetch` API (Node 18+). This code path is never reached in production because `AI_PROVIDER=anthropic`. Do not change `AI_PROVIDER` to `ollama` on this server.

---

### Step-by-Step Plesk Deployment

#### Step 1 — Build the artifacts locally

Run these commands on your development machine from the project root:

```bash
# Build the API
cd server
npm run build
# Output: server/dist/

# Build the React client
cd ../client
npm run build
# Output: client/dist/
```

Both commands must complete without errors before proceeding.

#### Step 2 — Upload files via Plesk File Manager

1. Log in to Plesk at `http://103.27.60.66` (or the admin panel URL)
2. Navigate to **Domains** > **rasphael.cbimtech.com** > **File Manager**
3. Navigate to the document root (likely `/httpdocs`)

Upload the following directory structure. Create folders as needed:

```
/httpdocs/
  server/
    dist/           ← contents of local server/dist/
    package.json    ← local server/package.json
    .env            ← create this file (contents below)
  public/           ← contents of local client/dist/
    index.html
    assets/
```

**Important**: Upload the contents of `client/dist/` directly into `/httpdocs/public/` (or the document root itself if Plesk is configured to serve static files from `/httpdocs`). The `index.html` must be reachable as the root of the domain.

To upload:
- Select each folder/file and use **Upload** in File Manager
- For the server directory: upload `server/dist/` (the entire folder), plus `server/package.json`
- For the client: upload the contents of `client/dist/` into the appropriate static directory

#### Step 3 — Create the .env file on the server

In Plesk File Manager, navigate to `/httpdocs/server/` and create a new file named `.env`. Paste the contents from the "Production Environment Variables" section below.

**Never commit this file to git.**

#### Step 4 — Install production dependencies

In Plesk, open the **Terminal** (if available) or use SSH:

```bash
cd /httpdocs/server
npm install --production
```

This installs only the `dependencies` listed in `server/package.json` (not `devDependencies`).

#### Step 5 — Configure the Plesk Node.js extension

1. In Plesk, navigate to **Domains** > **rasphael.cbimtech.com** > **Node.js**
2. Set the following:

| Setting | Value |
|---------|-------|
| Node.js version | 16.20.2 |
| Application root | `/httpdocs/server` |
| Application startup file | `dist/server.js` |
| Application mode | `production` |

3. Click **Apply** or **Save**

#### Step 6 — Start the application

In the Plesk Node.js panel, click **Restart App** (or **Start App** if it has never run).

#### Step 7 — Verify the deployment

1. Open a browser and navigate to `http://rasphael.cbimtech.com`
2. You should see the Raphael login screen
3. Check the API health: `http://rasphael.cbimtech.com/api/v1/health` (if a health endpoint exists) or attempt a login

If the app does not start, check the Node.js application log in Plesk (Node.js panel > Logs).

#### Step 8 — Smoke test

```bash
# Check the API is responding (replace with actual health/login endpoint)
curl -I http://rasphael.cbimtech.com/api/v1/auth/login

# Expected: HTTP 405 (Method Not Allowed for GET) or 404
# Unexpected: Connection refused or 502 Bad Gateway
```

---

### Rollback Procedure

There is no automated rollback. To revert to the previous version:

1. Keep a local copy of the previously working `server/dist/` and `client/dist/` before each deployment
2. If the new deployment fails, re-upload the previous build artifacts via File Manager
3. Restart the app in the Plesk Node.js panel

---

## Production Environment Variables

Create this file at `/httpdocs/server/.env` on the Plesk server.

```dotenv
NODE_ENV=production
PORT=3001

# Database
DB_SERVER=CTC-COM-6996
DB_PORT=1433
DB_NAME=raphael
DB_USER=raphael_app
DB_PASSWORD=Raphael@2026!
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Auth — JWT signing secret (64-char hex, generated 2026-04-01)
SESSION_SECRET=0f54621b9a3e509a4dd357841b3a769477ef7026366890d17a0a79765d600b3f

# AI Advisor
AI_PROVIDER=anthropic
AI_API_KEY=<fill in your Anthropic API key>

# CORS — must match the public domain exactly
CLIENT_URL=http://rasphael.cbimtech.com
```

**Security notes**:
- The `SESSION_SECRET` above was generated on 2026-04-01. Rotate it if it is ever exposed.
- `DB_PASSWORD` is shown above for deployment convenience. Store it in Plesk environment variables instead of a plain `.env` file if the server is shared.
- `AI_API_KEY` must be set before the Raphael AI advisor features will work. Dashboard and all other features function without it.

---

## Required Secrets Reference

These values must be set on the server before the application starts. None are stored in the repository.

| Secret | Location on server | Description |
|--------|--------------------|-------------|
| `SESSION_SECRET` | `/httpdocs/server/.env` | 64-char random secret for signing JWTs. Rotating this invalidates all active sessions. |
| `DB_PASSWORD` | `/httpdocs/server/.env` | MS SQL Server password for the `raphael_app` login |
| `AI_API_KEY` | `/httpdocs/server/.env` | Anthropic API key — required only when `AI_PROVIDER=anthropic` |

---

## GitHub Actions Workflows

### ci.yml

**Trigger**: Push to `main`; pull request targeting `main`
**Purpose**: Fast feedback on every code change — fails within ~2 minutes if lint, typecheck, or unit tests break. The build job is gated behind both quality checks and confirms both workspaces compile and bundle successfully.

#### Jobs

| Job | Runs when | Description |
|-----|-----------|-------------|
| `lint-and-typecheck` (matrix: client, server) | Always — parallel | `npm run lint` + `npm run typecheck` in each workspace. `fail-fast: true` stops the matrix on first failure. |
| `unit-tests` (matrix: client, server) | Always — parallel | `npm test -- --coverage` in each workspace. `fail-fast: false` so both workspaces always report. Uploads coverage to GitHub artifacts (7-day retention). |
| `build` | After `lint-and-typecheck` AND `unit-tests` both pass | `npm run build` in `server/` then `client/`. Uploads `server-dist` and `client-dist` artifacts (3-day retention). |

#### Cache strategy

- `lint-and-typecheck` and `unit-tests`: `actions/setup-node@v4` with `cache: npm` keyed on `<workspace>/package-lock.json` — handles `node_modules` automatically.
- `build`: explicit `actions/cache@v4` entries for `server/node_modules`, `client/node_modules`, and `client/node_modules/.vite` (Vite incremental build cache keyed on lock file hash + source file hashes).

#### Required Secrets

None — this workflow performs no deployment and requires no credentials.

---

### pr-title-check.yml

**Trigger**: `pull_request` events: opened, synchronize, reopened, edited
**Purpose**: Enforces Conventional Commits format on PR titles before merge. Fails with a descriptive error message if the title does not match the required pattern.

#### Jobs

| Job | Runs when | Description |
|-----|-----------|-------------|
| `check-pr-title` | Always | Validates `github.event.pull_request.title` against the pattern `^(feat\|fix\|docs\|style\|refactor\|test\|chore\|perf\|ci)(\(.+\))?: .+`. Exits 1 with a clear error explaining the format if it does not match. |

#### Required Secrets

None.

---

### Planned: deploy.yml

Not yet implemented — blocked on confirming SSH access to the Plesk server.

Intended behaviour when implemented:

1. Trigger: push to `main` after `ci.yml` passes
2. Jobs: `build` → `deploy` (SSH to Plesk, upload artifacts, `npm install --production`, restart Node.js app)
3. Required secrets to configure in GitHub repo Settings > Secrets when this is implemented:

| Secret | Where to set | Description |
|--------|-------------|-------------|
| `PLESK_SSH_HOST` | GitHub repo Settings > Secrets | `103.27.60.66` |
| `PLESK_SSH_USER` | GitHub repo Settings > Secrets | SSH username on the Plesk server |
| `PLESK_SSH_KEY` | GitHub repo Settings > Secrets | Private key for SSH authentication |
| `PLESK_APP_ROOT` | GitHub repo Settings > Secrets | Absolute path to server app root (`/httpdocs/server`) |

---

### Planned: security.yml

Security scanning to add once the basic pipeline is validated:

- **Dependency audit**: `npm audit --audit-level=high` in both `server/` and `client/` — fails on high/critical vulnerabilities
- **CodeQL**: `github/codeql-action/analyze@v3` on `javascript`/`typescript` — static analysis for common vulnerability classes (injection, path traversal, insecure deserialization)
- Container scanning is not required — no Docker image for this project

---

### Branch Protection Recommended Settings

Configure these in GitHub repo Settings > Branches > `main`:

- Require status checks to pass before merging: `lint-and-typecheck (client)`, `lint-and-typecheck (server)`, `unit-tests (client)`, `unit-tests (server)`, `build`, `check-pr-title`
- Require branches to be up to date before merging
- Require at least 1 approving review
- Do not allow force pushes

---

## File Structure After Deployment

```
/httpdocs/                    ← domain document root
  server/
    dist/                     ← compiled TypeScript output (server.js, controllers/, etc.)
    node_modules/             ← production dependencies only (npm install --production)
    package.json
    .env                      ← production secrets — NOT in git
  public/                     ← or document root directly
    index.html                ← React SPA entry point
    assets/                   ← JS/CSS bundles (hashed filenames)
```

---

## Known Deployment Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Node.js 16.20.2 on Plesk (vs Node 20 ideal) | `AI_PROVIDER=ollama` path uses `fetch` (Node 18+) | Set `AI_PROVIDER=anthropic` in production; Ollama not used on this server |
| Manual deploy via File Manager | Slow, error-prone | Automate with GitHub Actions + SSH in a future task |
| No health check endpoint yet | Cannot confirm API is live without manual testing | Add `GET /health` endpoint as part of CI/CD task |
| MS SQL Server must be reachable from 103.27.60.66 | App fails to start if DB is unreachable | Confirm network routing between Plesk server and `CTC-COM-6996` before first deploy |
