# @git-compass/web

[![npm version](https://img.shields.io/npm/v/@git-compass/web?color=black&style=flat-square)](https://npmjs.com/package/@git-compass/web)
[![npm downloads](https://img.shields.io/npm/dm/@git-compass/web?color=black&style=flat-square)](https://npmjs.com/package/@git-compass/web)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-black?style=flat-square)](https://github.com/yourusername/git-compass/pulls)

A local, visual dashboard for [Git Compass](https://github.com/yourusername/git-compass) that turns your repository's commit history into something you can actually read and act on. No account required. No data leaves your machine.

```bash
cd /path/to/your/repo
npx @git-compass/web
```

Opens at `http://localhost:4321`.

---

## Why this exists

Most Git analytics tools are built for engineering managers sitting in a web app dashboard. This one is built for the developer who just wants to understand what is going on in their codebase right now, without setting up a SaaS account or piping their source code to a third-party server.

Everything runs locally. The analysis happens on your machine using your local Git history. Close the server and it is gone.

---

## What it shows you

**Repository Health Radar**

A five-dimensional view of your project across Stability, Velocity, Simplicity, Coverage, and Decoupling. Good for getting a quick read on where your architecture is holding up and where it is quietly degrading.

**Hotspot Detection**

Files with high change frequency and high author diversity get flagged automatically. Each one gets a Risk Score from 0 to 100 so you can decide where to focus refactoring effort without having to dig through logs yourself.

**Activity Heatmap**

A full codebase map that shows which modules are actively changing, which have gone dormant, and where new development clusters are forming. Useful for spotting parts of the codebase that are either getting too much attention or quietly rotting.

**Contributor Fatigue and Knowledge Silos**

Flags developers with high after-hours and weekend commit activity as potential burnout signals. Also identifies files where only one or two people have ever made changes, which is a risk most teams do not notice until someone leaves.

**AI Querying**

Ask plain-English questions about your repository and get direct answers:

- "Who has the most context on the auth module?"
- "Which files are most likely to break this sprint?"
- "Summarize what the team has been working on for the last 30 days."

Supports multiple AI SDKS. Requires an `{{AI_PROVIDER}}_API_KEY` environment variable. Everything else in the dashboard works without it.

---

## Getting started

You need Node.js 20 or later and a local Git repository.

```bash
# Run directly with npx (no install needed)
npx @git-compass/web

# Or install globally
npm install -g @git-compass/web
git-compass-web
```

The dashboard will open automatically at `http://localhost:4321`. Point it at a different repository using the path input on the dashboard, or set it ahead of time with an environment variable.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4321` | Port the server runs on |
| `GIT_COMPASS_CWD` | current directory | Repository path to analyze on startup |
| `{{AI_PROVIDER}}_API_KEY` | none | Required for AI querying features only |

---

## How it works

The backend is a lightweight Node.js HTTP server built on `@git-compass/core`. It parses your Git history using `simple-git`, runs the analytics, and serves a JSON API to the frontend. The frontend is plain JavaScript with no build step, which means it starts instantly and has no framework overhead.

There is no database, no telemetry, and no background processes. When you close the server, nothing persists.

---

## Part of the Git Compass ecosystem

This package is the visual layer. The rest of the ecosystem:

- [`git-compass`](https://npmjs.com/package/git-compass) — the CLI tool for terminal-based analysis and report generation
- [`@git-compass/core`](https://github.com/yourusername/git-compass) — the underlying analytics engine, available separately if you want to build on top of it

---


