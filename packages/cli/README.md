# @grotto/cli

> Git repository analytics from your terminal.

Grotto is a powerful command-line tool designed to help developers and teams understand their codebases better. It analyzes Git history to reveal hotspots, risk areas, contributor trends, and potential knowledge silos.

## Features

- **Hotspot Analysis**: Identify frequently changed files that may need refactoring.
- **Risk Scoring**: Automated risk assessment based on change frequency and complexity.
- **Contributor Insights**: Track commit patterns, active days, and potential burnout.
- **Temporal Coupling**: Find files that are often changed together, revealing hidden dependencies.
- **Knowledge Silos**: Detect files with a single primary author (high "bus factor" risk).
- **Code Health**: Monitor code rot (abandoned files) and average impact (blast radius).
- **AI Summary**: Get high-level, natural language insights from your repository data (powered by Anthropic Claude).
- **Natural Language Queries**: Ask questions about your repo like "Who knows the most about the auth module?" or "Which files are most risky?"

## Installation

```bash
npm install -g @grotto/cli
# or
pnpm add -g @grotto/cli
```

## Getting Started

### 1. Configure your API Key (Optional)
To use AI-powered features, set your Anthropic API key:

```bash
grotto config set ai.key <your-api-key>
```

### 2. Run your first analysis
Analyze the current repository:

```bash
grotto analyze
```

## Command Walkthrough

### `analyze`
The primary command for generating repository insights.

```bash
grotto analyze [options]
```

**Options:**
- `-p, --path <path>`: Path to the Git repository (default: current directory).
- `-b, --branch <branch>`: Branch to analyze (default: `HEAD`).
- `-w, --window <window>`: Time window for analysis: `7d`, `30d`, `90d`, `1y`, or `all` (default: `30d`).
- `--max-commits <n>`: Maximum number of commits to analyze (default: `500`).
- `-o, --output <path>`: Save the report to a file (JSON or HTML).
- `-f, --format <format>`: Output format for the saved report: `json` or `html`.
- `--ai`: Generate an AI-powered digest of the analysis.

### `watch`
Monitor your repository in real-time. Automatically re-runs analysis whenever new commits or changes are detected in `.git`.

```bash
grotto watch -p /path/to/repo
```

### `query`
Ask natural language questions about your repository state. Requires an AI key.

```bash
grotto query "Which files have the highest temporal coupling?"
grotto query "Analyze the contributor trends for the last 30 days."
```

### `config`
Manage your global Grotto settings.

```bash
grotto config list
grotto config get ai.key
grotto config set ai.key <key>
```

## Environment Variables

You can also provide the AI key via an environment variable:
- `ANTHROPIC_API_KEY`: Your Anthropic API key.

## Development

To run the CLI from source during development:

```bash
# In the packages/cli directory
npm run dev # watchers tsc
npx tsx src/bin/grotto.ts analyze
```

---
Built with ❤️ for better code.
