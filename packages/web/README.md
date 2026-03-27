# @git-compass/web

<div align="center">

[![npm version](https://img.shields.io/npm/v/@git-compass/web?style=flat-square&color=0f3460&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/web)
[![npm downloads](https://img.shields.io/npm/dm/@git-compass/web?style=flat-square&color=0f3460&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/web)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&labelColor=0a0c10)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6?style=flat-square&labelColor=0a0c10)](https://www.typescriptlang.org)
[![Powered by core](https://img.shields.io/badge/powered%20by-@git--compass%2Fcore-0f3460?style=flat-square&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/core)
[![Local-first](https://img.shields.io/badge/local--first-privacy%20preserving-34d399?style=flat-square&labelColor=0a0c10)](https://github.com/humblef0ol/git-compass)


**A local-first, privacy-preserving Git intelligence dashboard.**

Point it at any repository. Get deep architectural analytics, AI-powered insights, burnout detection, knowledge mapping, ownership drift, coupling analysis, onboarding scores, and snapshot-based regression tracking, all running on your machine, with your data never leaving it.

[Installation](#installation) · [Quick Start](#quick-start) · [Dashboard](#dashboard-overview) · [AI Engine](#ai-engine) · [Snapshots](#snapshots) · [API](#api-reference) · [Configuration](#configuration)

</div>

---

## What is `@git-compass/web`?

`@git-compass/web` is a **local-first single-page application** served by a lightweight Node.js HTTP server. It wraps the full analytical power of [`@git-compass/core`](https://www.npmjs.com/package/@git-compass/core) in an interactive browser dashboard, no cloud account, no telemetry, no data leaving your machine.

It is designed for:

- **Engineering leads** who want a visual health overview of their codebase
- **Staff engineers** investigating hotspots, coupling debt, and knowledge concentration
- **Team leads** tracking burnout signals, review debt, and delivery consistency
- **Onboarding managers** generating learning paths and readiness scores for new contributors
- **Anyone** who wants to understand what is actually happening in a Git repository

---

## Installation

```bash
# npm
npm install -g @git-compass/web

# pnpm
pnpm add -g @git-compass/web

# yarn
yarn global add @git-compass/web
```

Or use it without installing via `npx`:

```bash
npx @git-compass/web --repo ./path/to/your/repo
```

### Requirements

- **Node.js** `>=20.0.0`
- A valid local Git repository
- *(Optional)* An API key for one of the supported AI providers — required only for AI-powered features

### AI Provider Setup *(optional)*

`@git-compass/web` supports multiple LLM providers. Set any one of the following environment variables to enable AI features:

```bash
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic Claude
OPENAI_API_KEY=sk-...               # OpenAI GPT-4
GOOGLE_GENAI_API_KEY=AI...          # Google Gemini
```

The dashboard auto-detects which key is present. You can also configure the provider interactively from the dashboard settings panel.

---

## Quick Start

```bash
# Start the dashboard for your current directory
npx @git-compass/web
```

The dashboard opens automatically in your default browser at `http://localhost:3000`. Use the branch selector in the header to switch between branches.

---

## Dashboard Overview

### Dashboard Layout

The dashboard is a single-page interactive interface divided into two main sections:

1.  **Core Overview**: High-level repository health and process metrics.
2.  **Behavioral Insights**: Deep analysis of ownership, coupling, and team dynamics.

---

## Core Overview

The main view renders immediately after analysis and shows:

| Section | What it shows |
|---|---|
| **Health Score** | Overall repository health percentage in the header |
| **Global Stats** | Total commits, active authors, churn index, and risk level |
| **Health Radar** | Five-dimension radar: Stability, Quality, Simplicity, Coverage, Velocity |
| **Temporal Stability** | Line chart of change density and commit volume over time |
| **Contributor Timeline** | Multi-line chart showing activity levels for the top 5 contributors |
| **Risk Areas** | Top files by weighted risk score (CRITICAL / HIGH / MEDIUM) |
| **Signal & Noise** | Functional commit ratio vs. bot/merge noise, with top noise sources |
| **Process Anomalies** | Statistically significant spikes in velocity or consistency |
| **Hotspot Risk Matrix** | Bubble chart mapping file churn (X) vs. author diversity (Y) |
| **Ownership Treemap** | Visual folder-level ownership distribution |
| **Activity Heatmap** | GitHub-style 12-month contribution grid |

---

## Behavioral Insights

Deep analytical reports populated in parallel after every analysis run.

### Knowledge Silos & Orphans

Track how file ownership is distributed and identify high-risk "silos".

- **Orphaned Files** — files whose primary author is no longer active, indicating stale ownership.
- **Knowledge Concentration** — Gini coefficient rating for files (High knowledge concentration vs distributed).

### Architectural Coupling

Detect co-change relationships that don't appear in your structural import graph.

- **Strongest Couplings** — file pairs that consistently change together (Jaccard similarity).
- **Trend Detection** — whether couplings are strengthening or weakening over time.

### Review Quality & Bottlenecks

Surface gaps in code review coverage and identify reviewer bottlenecks.

- **Review Coverage** — ratio of commits with review signals vs. direct pushes.
- **Reviewer Load** — identify if a single reviewer handles >50% of the volume (Bottleneck detection).

### Repository Risk Profile

Combined assessment of codebase health and churn.

- **Overall Risk** — 0–100 composite score based on churn frequency and historical risk factors.
- **File Risk** — identification of the highest-risk files in the current window.

### Onboarding & Knowledge Flow

A composite score for how approachable your repository is to new contributors.

- **Onboarding Difficulty** — 0–100 composite score (Excellent / Good / Fair / Needs Attention).
- **Knowledge Flow** — recent owner transitions (handovers) between developers.
- **Recommended Entry Points** — prioritised entry points for navigating the codebase.
- **Learning Path** — ordered list of files a new contributor should explore first.
- **Contributor Comparison** — table showing impact, stability, and onboarding scores per author.

### AI Insights

Structured, audience-aware insights generated by your configured LLM provider. *Requires an AI API key.*

- **Audience Templates** — switch between `Technical`, `Executive`, and `Onboarding` output styles.
- **Insight Pack** — three columns: Critical, Warnings, Opportunities — each insight includes title and description.
- **Interactive Query** — ask direct questions about the repository analytics (e.g., "Which files are most at risk?").

---

## Snapshots

Save point-in-time analytical states and compare them to track codebase health over time.

- **Capture Current State** — save the current analysis analytics to a snapshot.
- **Time Machine History** — view all saved snapshots with capture date and commit hash.
- **Delta Analysis** — select a snapshot from history to compare with current state: regressions shown in red, improvements in green, with an AI-generated narrative explaining the changes.

---

## AI Engine

The AI layer is provider-agnostic and supports automatic key discovery:

| Provider | Environment Variable | Notes |
|---|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude models |
| **OpenAI** | `OPENAI_API_KEY` | GPT-4 and above |
| **Google Gemini** | `GOOGLE_GENAI_API_KEY` | Gemini 1.5 and above |

Set any one variable and the dashboard will use that provider automatically. If multiple keys are present, Anthropic takes precedence.

### What the AI layer does

**Insight Packs** — click "Refresh" in the AI section to receive a structured `{ critical, warnings, opportunities }` insights.

**Interactive Query** — ask natural language questions via the query bar. The AI receives the repository's analytical profile and answers based on the computed metrics.

**Snapshot Comparison Narratives** — comparing a historical snapshot with the current state generates a 2–4 paragraph narrative contextualising what changed and what the team should prioritise.

### Privacy

All AI calls go from your local server to the provider's API directly. No data passes through any Git Compass server. The only data sent to the AI provider is the serialised analytics result — no raw file contents, no commit messages, no author email addresses beyond what is already in the structured output.

---

## Incremental Analysis

For large repositories, full re-analysis on every run is slow. Enable **Incremental mode** with the toggle next to the Analyse button.

### How it works

1. **First run** — full analysis is performed and a baseline is cached to `.git-compass/snapshots/` in your working directory.
2. **Subsequent runs** — the server detects existing snapshots and performs an incremental update if possible, processing only new commits.
3. **Result** — the dashboard renders using the merged baseline.

### Cache location

```
.git-compass/snapshots/
└── <branch-name>/
    └── snapshot_<timestamp>.json
```

These files are safe to commit, share, or delete. If a baseline becomes stale (e.g. the SHA no longer exists after a force-push), the server automatically falls back to a full analysis and rebuilds the cache.

### Forcing a full re-analysis

Delete the `.git-compass/` directory to force a full re-analysis.

---

## Noise Filtering

Raw Git history contains noise that corrupts analytics. `@git-compass/web` filters it during analysis.

**Filtered by default:**

| Type | Examples |
|---|---|
| Bot commits | Dependabot, Renovate, `[bot]` authors, `noreply@` emails |
| Merge commits | `Merge pull request`, `Merge branch` |
| Release commits | `chore(release):`, `Bump X from Y to Z` |
| Lockfile files | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock` |
| Generated files | `dist/**`, `*.snap`, `openapi.json`, `*.min.js` |
| Asset files | `*.png`, `*.svg`, `*.woff`, `*.ttf` |

**Not filtered by default** (carry signal for some analyzers):

`tsconfig.json` · `.eslintrc` · `.github/workflows/` · `*.md` · `Dockerfile`

The Signal Integrity Banner after every run shows exactly how much noise was removed and which analyzers were most affected.

### Custom filter configuration

Pass filter options via the settings panel in the dashboard, or via the API:

```json
{
  "excludePatterns": ["**/migrations/**", "src/generated/**"]
}
```

---

## API Reference

`@git-compass/web` exposes a JSON API consumed by the dashboard. All endpoints accept and return JSON. All require a `repoPath` parameter.

### Core Analysis

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Triggers a full analysis run (including P0/P1/P2) |

**`POST /api/analyze`**
```json
{
  "branch": "main",
  "commitsCount": 500,
  "windowDays": 30,
  "excludePatterns": "**/dist/**,**/node_modules/**",
  "createSnapshot": false
}
```

---

Full analysis returns a combined object containing:
- `p0`: Signal integrity and noise analysis
- `p1`: Hotspots, velocity, quality, contributors
- `p2`: Ownership, dependency, review debt, risk, health, onboarding, compass

---

### AI Endpoints

All AI endpoints require a configured API key. Return `503` if no key is available.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/insights` | Generate structured insight pack |
| `POST` | `/api/ai/compare` | Compare a snapshot with the current state |
| `POST` | `/api/ai/query` | Natural language query about the repo |

**`POST /api/ai/insights`**
```json
{
  "repoPath": "/path/to/repo",
  "branch": "main",
  "windowDays": 30,
  "audience": "technical"
}
```

**`POST /api/ai/compare`**
```json
{
  "branch": "main",
  "baseSnapshotId": "snapshot_2023-10-01-T12-00-00.json"
}
```

---

### Snapshots

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/snapshots` | List all saved snapshots for a branch |

**`GET /api/snapshots`**
```json
{
  "repoPath": "/path/to/repo",
  "branch": "main",
  "name": "pre-refactor"
}
```

**`POST /api/ai/query`**
```json
{
  "branch": "main",
  "query": "Which files are most at risk this sprint?"
}
```

---

## Configuration

### CLI Flags

| Flag | Default | Description |
|---|---|---|
| `--repo` | `process.cwd()` | Path to the Git repository to analyze |
| `--port` | `3000` | Port to serve the dashboard on |

### Environment Variables

| Variable | Description |
|---|---|
| `GIT_COMPASS_LLM_KEY` | Encrypted API key stored in `.env` |
| `GIT_COMPASS_LLM_PROVIDER` | `openai`, `anthropic`, or `google` |
| `PORT` | Override default port (default: 3000) |

---

## VS Code Integration

Every file path displayed in the dashboard is clickable. Clicking a file path fires a `vscode://file/...` URI that opens the file directly in VS Code at the correct line if available.

This works out of the box with no VS Code extension required — it uses the URI scheme handler built into VS Code.

---

All analysis runs on your local CPU — no network calls except to your configured AI provider.

---

## FAQ

**Does it work on monorepos?**
Yes. Point `--repo` at the monorepo root. Use `excludePatterns` in the filter settings to scope analysis to specific packages.

**Does it work on private repositories?**
Yes. The dashboard reads the local Git object store via `simple-git`. No remote API calls are made to GitHub, GitLab, or any Git host unless you use the AI engine (which calls your configured LLM provider directly).

**Can I run it in CI?**
The API layer is independent of the browser UI. Call `POST /api/analyze` from any CI script to get structured JSON analytics. Use `POST /api/snapshots` to save a named snapshot, then `POST /api/ai/compare-snapshots` to get a regression report between releases.

**Does it support GitLab / Azure DevOps / Bitbucket?**
Yes — it reads local git history and is host-agnostic. Clone any repo locally and point `--repo` at it.

**Where is my data stored?**
All data is stored locally in `.git-compass-cache/` in your working directory. Nothing is sent to any Git Compass server. The only external calls are to your configured AI provider, and only when you explicitly trigger an AI feature.

**Can I run it without an AI key?**
Yes. All core analytics (hotspots, risk scoring, knowledge silos, velocity, ownership, coupling, onboarding score, review debt) run entirely locally. Only the Narrative Summary, Interactive Query, and Insight Pack require a key.

**Can multiple people use the same dashboard?**
The server is designed for local single-user use. For team-wide access, run it on a shared machine or in a container on your internal network. There is no authentication layer built in — add a reverse proxy if you need access control.

---

## Keywords

git analytics dashboard · git repository health · code quality visualization · technical debt dashboard · hotspot detection · knowledge silo · bus factor · burnout detection · temporal coupling · ownership drift · code churn · developer productivity · engineering intelligence · local-first · privacy-preserving · git history dashboard · commit analysis · repository metrics · onboarding score · review debt · velocity tracking · incremental git analysis · AI code insights · Node.js git dashboard

---

<div align="center">

Built with precision by the **Git Compass** team · [npm](https://www.npmjs.com/package/@git-compass/web) · [GitHub](https://github.com/humblef0ol/git-compass) · [Core Package](https://www.npmjs.com/package/@git-compass/core)

</div>