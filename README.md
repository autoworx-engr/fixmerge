# FixMerge

A lightweight, self-hosted PR quality gate built with **Next.js**. Automatically analyzes merged pull requests for bugs, security issues, code complexity, and quality problems.

## What It Does

When a PR is merged on GitHub, FixMerge:

1. **Receives a webhook** from GitHub
2. **Fetches the changed files** and their full content via GitHub API
3. **Runs 4 analyzers** on the code:
   - **Bug Detector** — bare excepts, eval, hardcoded secrets, mutable defaults, async-in-forEach, debugger statements (14 rules)
   - **Security Analyzer** — SQL injection, XSS, command injection, unsafe deserialization, disabled SSL, .env files (14 rules)
   - **Complexity Analyzer** — function length, cyclomatic complexity, nesting depth, file size
   - **Quality Analyzer** — linter suppressions, empty catch blocks, wildcard imports, PR size (7+ rules)
4. **Scores the PR** from 0–100 and assigns a grade (A–F)
5. **Posts a comment** on the PR with a summary of findings
6. **AI Explainer** — get AI-powered summaries and per-issue deep explanations
7. **Displays everything** on a premium dark dashboard with animated charts

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL (Railway PostgreSQL) and GITHUB_TOKEN

# Push schema to database
npx prisma db push

# Run development server
npm run dev
```

Open http://localhost:3000 to see the dashboard.

## Set Up GitHub Webhook

Each registered project gets its own **webhook secret** in the dashboard (stored in the database). In the GitHub repo → Settings → Webhooks → Add webhook:

- **Payload URL:** `https://your-server.com/api/webhook/github` (same URL for every customer; the server looks up the repo from the payload)
- **Content type:** `application/json`
- **Secret:** the **project webhook secret** from the FixMerge dashboard for that repository (not a single global value per company)
- **Events:** Select "Pull requests"

For local development, use [ngrok](https://ngrok.com) to expose localhost.

## Environment variables (one deployment, many companies)

| Variable | Scope | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | **Server** | One Postgres for the whole app; each company/project is a row (`Company`, `Project`). |
| `GITHUB_TOKEN` | **Server** | PAT (or future: GitHub App) the server uses to call GitHub for **all** repos you analyze. It must be able to read those repositories (broad org token, or a bot account with access). |
| `GITHUB_WEBHOOK_SECRET` | **Optional** | Global fallback HMAC secret for webhooks whose `repository.full_name` is **not** yet linked to a `Project`. If unset, those requests skip signature verification. **Registered projects always use their dashboard `webhookSecret`**, not this env var. |
| `AI_API_KEY` / `OPENAI_API_KEY` | **Server** | Optional; shared AI quota for the deployment unless you later split per tenant. |

**Webhook secrets:** Managed per **project** in the DB (`Project.webhookSecret`). Each GitHub repo pastes its own secret when configuring the webhook—no per-customer `.env` file on your server.

**API keys:** Each **company** gets a unique `apiKey` (Bearer token) for `/api/analyses` etc., also stored in the database.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhook/github` | GitHub webhook receiver |
| `GET` | `/api/analyses` | List all analyses (JSON) |
| `GET` | `/api/analyses/:id` | Get analysis details with issues (JSON) |
| `POST` | `/api/ai/explain` | AI-powered issue explanation |
| `GET` | `/api/ai/summary?id=` | AI-powered PR analysis summary |
| `GET` | `/api/health` | Health check |
| `GET` | `/` | Web dashboard |
| `GET` | `/report/:id` | Detailed report page |

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Prisma** with PostgreSQL
- **GitHub API** for PR data
- **OpenAI API** (or compatible) for AI explanations

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Dashboard
│   ├── report/[id]/page.tsx          # PR report page
│   ├── api/
│   │   ├── webhook/github/route.ts   # Webhook receiver
│   │   ├── analyses/route.ts         # List analyses
│   │   ├── analyses/[id]/route.ts    # Analysis detail
│   │   ├── ai/explain/route.ts       # AI issue explainer
│   │   ├── ai/summary/route.ts       # AI PR summary
│   │   └── health/route.ts           # Health check
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── github.ts                     # GitHub API client
│   ├── engine.ts                     # Analysis orchestrator
│   ├── ai.ts                         # AI explainer (OpenAI)
│   ├── types.ts                      # Shared types
│   └── analyzers/
│       ├── bug-detector.ts           # 14 bug-pattern rules
│       ├── security.ts               # 14 security rules
│       ├── complexity.ts             # Complexity metrics
│       ├── quality.ts                # Code quality checks
│       ├── utils.ts                  # Diff parsing utilities
│       └── index.ts
├── components/
│   ├── grade-badge.tsx
│   ├── grade-distribution.tsx        # Animated donut + bar chart
│   ├── score-ring.tsx                # Animated SVG score ring
│   ├── severity-pill.tsx
│   ├── issue-card.tsx
│   ├── ai-summary.tsx                # AI PR summary panel
│   └── ai-explain-button.tsx         # Per-issue AI explainer
└── generated/prisma/                 # Prisma generated client
```
