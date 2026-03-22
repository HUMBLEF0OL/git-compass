# git-compass

[![npm version](https://img.shields.io/npm/v/git-compass.svg)](https://www.npmjs.com/package/git-compass)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**Git Compass** is a local-first, AI-augmented analytics engine that delivers deep insights into your code's evolution directly from your terminal. No cloud required, no privacy compromises.

It helps developers and teams understand their codebases better by analyzing Git history to reveal **hotspots**, **risk areas**, **contributor trends**, and **potential knowledge silos**.

---

## Key Features

### Deep Repository Intelligence

- **Hotspot Detection**: Automatically bridge the gap between "frequently changed" and "risky" by analyzing churn velocity and author diversity.
- **Architectural Risk Scoring**: Real-time risk assessment for every file, Helping you prioritize refactors based on where technical debt is actually growing.
- **Temporal Coupling**: Surface hidden dependencies between files that always change together but aren't explicitly linked in code.
- **Code Health Monitoring**: Track code rot (abandoned files) and average impact (blast radius).

### Team Dynamics & Health

- **Bus Factor Analysis**: Identify critical knowledge silos where a single person is the primary author of a component.
- **Burnout Mitigation**: Heatmaps of after-hours and weekend commit patterns to help teams maintain a healthy pace.
- **Contributor DNA**: Understand how different perspectives contribute to your codebase over time.

### AI-Powered Synthesis (Optional)

- **Natural Language Insights**: Generate human-readable summaries of complex Git history (powered by Anthropic Claude or OpenAI).
- **Interactive Queries**: Ask your repo questions: _"Who knows the most about the auth module?"_ or _"Which files are most risky?"_

---

## Installation

```bash
# Global install (recommended)
npm install -g git-compass

# Or run instantly via npx
npx git-compass analyze
```

---

## Quick Start

### 1. Simple Analysis

Generate a comprehensive report for your current repository:

```bash
git-compass analyze
```

### 2. Time-Windowed Deep Dive

Analyze the last 90 days of history:

```bash
git-compass analyze --window 90d
```

### 3. AI Insights (Requires API Key)

Unlock natural language summaries:

```bash
# Set your key once
git-compass config set ai.openaiKey <your-openai-key>
# or
git-compass config set ai.anthropicKey <your-anthropic-key>

# Run with AI augmentation
git-compass analyze --ai
```

---

## Command Reference

### `analyze`

The primary engine for generating repository insights.

- `-p, --path <path>`: Path to Git repository (default: `.`)
- `-b, --branch <branch>`: Branch to analyze (default: `HEAD`)
- `-w, --window <window>`: Time window (`7d`, `30d`, `90d`, `1y`, `all`)
- `--max-commits <n>`: Cap the analysis scope
- `-o, --output <path>`: Export to JSON or HTML report

### `query`

Interactive natural language interface for your repository.

```bash
git-compass query "Show me the files with the highest churn in the last week"
```

### `watch`

Real-time monitoring mode. Automatically re-analyzes your repo as you commit.

---

## Configuration

Git Compass stores settings in a local config file. You can manage them via:

```bash
git-compass config list
git-compass config set <key> <value>
```

**Available Keys:**

- `ai.provider`: LLM provider (`openai`, `anthropic`, `gemini`)
- `ai.openaiKey`: Your OpenAI API key.
- `ai.anthropicKey`: Your Anthropic API key.

---

## Privacy & Safety

Git Compass is **local-first**. All repository parsing and traditional analytics happen entirely on your machine. If you choose to use the optional AI features, only the summarized metadata (never your full source code) is sent to the LLM provider for synthesis.

---

Built with care for teams that value code health.
