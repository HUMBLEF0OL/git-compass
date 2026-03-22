# @git-compass/web

[![npm version](https://img.shields.io/npm/v/@git-compass/web.svg)](https://www.npmjs.com/package/@git-compass/web)
[![Privacy: Local-first](https://img.shields.io/badge/Privacy-Local--first-green.svg)](#)

> Stop flying blind. Git Compass turns your repository history into a map of technical debt, risk, and architectural health, all without your code ever leaving your machine. It helps teams regain control of their codebase by identifying hidden risks, tracking development velocity, and providing AI-powered architectural insights, all through a privacy-first, local-only dashboard.

---

## The Core Challenge

Modern codebases grow faster than our ability to understand them. As a project scales, opacity increases, hidden risks (Hotspots) go unnoticed, and manual audits become impossible. Existing cloud-based tools often require compromising repository privacy.

**Git Compass solves this by providing actionable intelligence directly from your local environment:**

- **Privacy First:** All analysis happens locally; no code is ever uploaded.
- **Zero Config:** Instant insights for any Git repository with a single command.
- **AI-Enhanced:** Optional architectural summaries using your own LLM keys.

---

## Quick Start

Analyze any local repository in seconds:

```bash
cd /path/to/your/repo
npx @git-compass/web
```

Opens at `http://localhost:4321`.

---

## Actionable Features

### Risk Mitigation (Code Hotspots)

Identify the most critical files in your project. We calculate a Risk Score based on churn and complexity, allowing you to prioritize areas that are most likely to fail.

### Architectural Clarity (Health Radar)

Visualize health across five dimensions: Stability, Velocity, Simplicity, Coverage, and Decoupling. Track whether your architecture is improving or degrading over time.

### Velocity and Stability Tracking

Understand the development rhythm of your project. Monitor code volatility and identify burnout or aggressive refactoring phases at a glance.

### Natural Language Repository Query

Query your repository using plain English to find risky areas, identify contributors with specific context, or explain high-churn modules.

---

## Customizable Analysis

Git Compass provides a powerful settings interface to tailor the analysis to your needs:

- **Project Scope:** Filter analysis by branch, time window (days/months), and commit depth.
- **AI Integration:** Configure and switch between AI providers (OpenAI, Anthropic, etc.) to get automated insights.
- **Local Overrides:** Use environment variables like `PORT` and `GIT_COMPASS_CWD` for advanced configurations.

---

## How it Works

```mermaid
graph LR
    UserRepo[(Local Git Repo)] --> Core[@git-compass/core]
    Core -->|Local Analysis| Web[Next.js Dashboard]
    Web -->|UI| Action[Actionable Insights]
    UserRepo -.->|Optional| LLM[Private AI Analysis]
```

---

## Tags

`git` `analytics` `dashboard` `local-first` `developer-tools` `git-analysis` `churn` `hotspots` `technical-debt` `risk-management` `privacy-first` `enterprise-git` `code-forensics` `quality-assurance` `release-intelligence` `technical-debt-tracker` `refactoring-assistant`

---

MIT Copyright © [Git Compass Team](https://github.com/HUMBLEF0OL)
