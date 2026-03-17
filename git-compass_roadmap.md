# Git Compass — Full Project Build Specification

> A local-first, AI-augmented Git analytics tool for developers.  
> Stack: Node.js + TypeScript (monorepo) · Next.js (web dashboard) · VS Code Extension (TypeScript)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Package Breakdown](#3-package-breakdown)
   - [3.1 `@git-compass/core` — Analytics Engine](#31-gitcompasscore--analytics-engine)
   - [3.2 `@git-compass/cli` — CLI Tool](#32-gitcompasscli--cli-tool)
   - [3.3 `@git-compass/web` — Next.js Dashboard](#33-gitcompassweb--nextjs-dashboard)
   - [3.4 `@git-compass/vscode` — VS Code Extension](#34-gitcompassvscode--vs-code-extension)
4. [Data Models & Interfaces](#4-data-models--interfaces)
5. [API Design](#5-api-design)
6. [Feature Implementation Guide](#6-feature-implementation-guide)
7. [Environment & Config](#7-environment--config)
8. [Testing Strategy](#8-testing-strategy)
9. [CI/CD & Publishing](#9-cicd--publishing)
10. [Phased Implementation Order](#10-phased-implementation-order)

---

## 1. Project Overview

**Git Compass** is a developer-first Git repository analytics tool that runs entirely on-machine. It parses Git history and surfaces insights including hotspot files, code churn, contributor activity, risky commits, and AI-generated summaries — all from the CLI, a web dashboard, or directly inside VS Code.

### Core Principles

- **Local-first**: No code or metadata leaves the machine unless explicitly opted in.
- **Privacy-safe**: No SaaS account required. Works offline.
- **Developer-native**: Lives in the terminal and editor, not in a web dashboard aimed at managers.
- **AI-augmented**: Optional LLM integration for plain-English summaries and natural language querying.

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Node.js Latest |
| Monorepo | pnpm workspaces + Turborepo |
| Git parsing | `simple-git` |
| CLI framework | Commander.js |
| Web dashboard | Next.js Latest (App Router) |
| UI components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| VS Code extension | VS Code Extension API |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| AI integration | Anthropic SDK (optional) |

---

## 2. Monorepo Architecture

### Directory Structure

```
Git Compass/
├── packages/
│   ├── core/                   # @git-compass/core — analytics engine
│   ├── cli/                    # @git-compass/cli — CLI tool (npm published)
│   ├── web/                    # @git-compass/web — Next.js dashboard
│   └── vscode/                 # @git-compass/vscode — VS Code extension
├── tooling/
│   ├── eslint-config/          # shared ESLint config
│   ├── tsconfig/               # shared tsconfig bases
│   └── vitest-config/          # shared Vitest config
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── publish-cli.yml
│       └── publish-vscode.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

### Root `package.json`

```json
{
  "name": "Git Compass",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.2.0",
    "eslint": "^9.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "tooling/*"
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "out/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "type-check": {}
  }
}
```

### Shared `tsconfig` base (`tooling/tsconfig/base.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 3. Package Breakdown

---

### 3.1 `@git-compass/core` — Analytics Engine

The brain of the project. Pure TypeScript, no CLI concerns. Every other package consumes this.

#### Directory Structure

```
packages/core/
├── src/
│   ├── index.ts                # public API exports
│   ├── types.ts                # all shared TypeScript interfaces
│   ├── parser/
│   │   ├── index.ts
│   │   ├── git-parser.ts       # raw commit extraction via simple-git
│   │   └── diff-parser.ts      # per-file diff analysis
│   ├── analyzers/
│   │   ├── hotspot.ts          # frequently changed files
│   │   ├── churn.ts            # lines added/removed over time
│   │   ├── risk.ts             # per-file risk scoring
│   │   ├── contributor.ts      # developer activity mapping
│   │   ├── burnout.ts          # after-hours / workload detection
│   │   └── compass.ts          # onboarding file priority map
│   ├── ai/
│   │   ├── summarizer.ts       # LLM-powered repo digest
│   │   └── nl-query.ts         # natural language querying
│   └── utils/
│       ├── date.ts
│       └── file.ts
├── package.json
└── tsconfig.json
```

#### `package.json`

```json
{
  "name": "@git-compass/core",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "simple-git": "^3.24.0",
    "@anthropic-ai/sdk": "^0.24.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

#### Key Source Files

**`src/parser/git-parser.ts`**
```typescript
import simpleGit, { SimpleGit, LogResult, DefaultLogFields } from "simple-git";
import type { RawCommit, ParseOptions } from "../types.js";

export class GitParser {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  async isValidRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getCommits(options: ParseOptions = {}): Promise<RawCommit[]> {
    const { branch = "HEAD", since, until, maxCount = 500 } = options;

    const logOptions: Record<string, string | number> = {
      "--max-count": maxCount,
      "--stat": "",
    };

    if (since) logOptions["--since"] = since;
    if (until) logOptions["--until"] = until;

    const log: LogResult<DefaultLogFields> = await this.git.log([
      branch,
      `--max-count=${maxCount}`,
      "--stat=4096",
      ...(since ? [`--since=${since}`] : []),
      ...(until ? [`--until=${until}`] : []),
    ]);

    return log.all.map((commit) => ({
      hash: commit.hash,
      author: commit.author_name,
      email: commit.author_email,
      date: new Date(commit.date),
      message: commit.message,
      body: commit.body,
      diff: commit.diff ?? null,
    }));
  }

  async getFileDiff(commitHash: string): Promise<string> {
    return this.git.show([commitHash, "--stat", "--name-only"]);
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branch();
    return result.current;
  }
}
```

**`src/analyzers/hotspot.ts`**
```typescript
import type { RawCommit, HotspotFile, AnalysisWindow } from "../types.js";

export function analyzeHotspots(
  commits: RawCommit[],
  window: AnalysisWindow = "30d"
): HotspotFile[] {
  const cutoff = getWindowCutoff(window);
  const filtered = commits.filter((c) => c.date >= cutoff);

  const fileMap = new Map<string, { changeCount: number; authors: Set<string>; lastChanged: Date }>();

  for (const commit of filtered) {
    const files = extractFilesFromDiff(commit.diff);
    for (const file of files) {
      const existing = fileMap.get(file) ?? {
        changeCount: 0,
        authors: new Set<string>(),
        lastChanged: commit.date,
      };
      existing.changeCount++;
      existing.authors.add(commit.author);
      if (commit.date > existing.lastChanged) existing.lastChanged = commit.date;
      fileMap.set(file, existing);
    }
  }

  return Array.from(fileMap.entries())
    .map(([path, data]) => ({
      path,
      changeCount: data.changeCount,
      uniqueAuthors: data.authors.size,
      lastChanged: data.lastChanged,
      riskScore: 0, // populated by risk.ts
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}

function getWindowCutoff(window: AnalysisWindow): Date {
  const now = new Date();
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[window];
  now.setDate(now.getDate() - days);
  return now;
}

function extractFilesFromDiff(diff: unknown): string[] {
  if (!diff || typeof diff !== "object") return [];
  // Parse simple-git diff object for changed file paths
  const diffObj = diff as { files?: Array<{ file: string }> };
  return diffObj.files?.map((f) => f.file) ?? [];
}
```

**`src/analyzers/risk.ts`**
```typescript
import type { HotspotFile, RiskScore } from "../types.js";

const WEIGHTS = {
  changeFrequency: 0.4,
  uniqueAuthors: 0.3,
  recentActivity: 0.3,
} as const;

export function computeRiskScores(files: HotspotFile[]): RiskScore[] {
  const maxChanges = Math.max(...files.map((f) => f.changeCount), 1);
  const maxAuthors = Math.max(...files.map((f) => f.uniqueAuthors), 1);
  const now = Date.now();

  return files.map((file) => {
    const frequencyScore = file.changeCount / maxChanges;
    const authorScore = file.uniqueAuthors / maxAuthors;
    const recencyScore = Math.min(
      1,
      (now - file.lastChanged.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    // Higher recency score = changed more recently = riskier
    const normalizedRecency = 1 - recencyScore;

    const totalScore =
      frequencyScore * WEIGHTS.changeFrequency +
      authorScore * WEIGHTS.uniqueAuthors +
      normalizedRecency * WEIGHTS.recentActivity;

    const level: "low" | "medium" | "high" | "critical" =
      totalScore >= 0.8 ? "critical" :
      totalScore >= 0.6 ? "high" :
      totalScore >= 0.4 ? "medium" : "low";

    return {
      path: file.path,
      score: Math.round(totalScore * 100),
      level,
      factors: {
        changeFrequency: Math.round(frequencyScore * 100),
        uniqueAuthors: Math.round(authorScore * 100),
        recentActivity: Math.round(normalizedRecency * 100),
      },
    };
  });
}
```

**`src/ai/summarizer.ts`**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult, AISummary } from "../types.js";

export class AISummarizer {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async summarize(analysis: AnalysisResult): Promise<AISummary> {
    const prompt = buildPrompt(analysis);

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0];
    if (text.type !== "text") throw new Error("Unexpected response type");

    return {
      digest: text.text,
      generatedAt: new Date(),
      model: message.model,
    };
  }

  async query(question: string, analysis: AnalysisResult): Promise<string> {
    const context = JSON.stringify(analysis, null, 2);
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
      messages: [{ role: "user", content: question }],
    });

    const text = message.content[0];
    if (text.type !== "text") throw new Error("Unexpected response type");
    return text.text;
  }
}

function buildPrompt(analysis: AnalysisResult): string {
  return `Analyze this Git repository data and provide a concise plain-English summary (3-5 sentences) covering: overall health, hotspot concerns, notable patterns, and any red flags.

Repository data:
- Total commits analyzed: ${analysis.meta.commitCount}
- Time window: ${analysis.meta.window}
- Top hotspot files: ${analysis.hotspots.slice(0, 3).map((h) => h.path).join(", ")}
- High-risk files: ${analysis.riskScores.filter((r) => r.level === "high" || r.level === "critical").length}
- Active contributors: ${analysis.contributors.length}
- Burnout flags: ${analysis.burnout.flags.length > 0 ? analysis.burnout.flags.join(", ") : "none"}

Respond in plain English. No bullet points. No markdown formatting.`;
}
```

---

### 3.2 `@git-compass/cli` — CLI Tool

Wraps the core engine into a user-facing CLI published to npm.

#### Directory Structure

```
packages/cli/
├── src/
│   ├── index.ts                # entry point, registers all commands
│   ├── commands/
│   │   ├── analyze.ts          # Git Compass analyze
│   │   ├── report.ts           # Git Compass report
│   │   ├── watch.ts            # Git Compass watch (polling mode)
│   │   ├── query.ts            # Git Compass query "who changed auth?"
│   │   └── hook.ts             # Git Compass hook install/uninstall
│   ├── formatters/
│   │   ├── console.ts          # terminal output with chalk
│   │   ├── json.ts             # JSON file output
│   │   └── html.ts             # standalone HTML report
│   └── utils/
│       └── config.ts           # .gitcompasrc config loader
├── bin/
│   └── Git Compass.js            # shebang entry point
├── package.json
└── tsconfig.json
```

#### `package.json`

```json
{
  "name": "@git-compass/cli",
  "version": "0.1.0",
  "description": "Git repository analytics from your terminal",
  "bin": {
    "Git Compass": "./bin/Git Compass.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc && chmod +x bin/Git Compass.js",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "@git-compass/core": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "conf": "^12.0.0",
    "chokidar": "^3.6.0"
  }
}
```

#### `src/commands/analyze.ts`

```typescript
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { GitParser, analyzeHotspots, computeRiskScores, analyzeChurn, analyzeContributors, analyzeBurnout } from "@git-compass/core";
import { printConsoleReport } from "../formatters/console.js";
import { writeJsonReport } from "../formatters/json.js";
import { writeHtmlReport } from "../formatters/html.js";
import type { ParseOptions } from "@git-compass/core";

export const analyzeCommand = new Command("analyze")
  .description("Analyze a Git repository and surface insights")
  .option("-p, --path <path>", "path to git repository", process.cwd())
  .option("-b, --branch <branch>", "branch to analyze", "HEAD")
  .option("-w, --window <window>", "time window: 7d, 30d, 90d, 1y", "30d")
  .option("-o, --output <file>", "write output to file (json or html)")
  .option("--max-commits <n>", "max commits to analyze", "500")
  .option("--ai", "generate AI summary (requires ANTHROPIC_API_KEY)")
  .action(async (options) => {
    const spinner = ora("Parsing Git history...").start();

    try {
      const parser = new GitParser(options.path);

      if (!(await parser.isValidRepo())) {
        spinner.fail(chalk.red("Not a valid Git repository."));
        process.exit(1);
      }

      const parseOptions: ParseOptions = {
        branch: options.branch,
        window: options.window,
        maxCount: parseInt(options.maxCommits, 10),
      };

      const commits = await parser.getCommits(parseOptions);
      spinner.text = `Analyzing ${commits.length} commits...`;

      const hotspots = analyzeHotspots(commits, options.window);
      const riskScores = computeRiskScores(hotspots);
      const churn = analyzeChurn(commits, options.window);
      const contributors = analyzeContributors(commits);
      const burnout = analyzeBurnout(commits);

      const result = {
        meta: {
          repoPath: options.path,
          branch: options.branch,
          window: options.window,
          commitCount: commits.length,
          generatedAt: new Date(),
        },
        hotspots,
        riskScores,
        churn,
        contributors,
        burnout,
        aiSummary: null as string | null,
      };

      if (options.ai) {
        spinner.text = "Generating AI summary...";
        const { AISummarizer } = await import("@git-compass/core");
        const summarizer = new AISummarizer();
        const summary = await summarizer.summarize(result);
        result.aiSummary = summary.digest;
      }

      spinner.succeed(chalk.green(`Analysis complete — ${commits.length} commits processed`));

      if (options.output?.endsWith(".json")) {
        await writeJsonReport(result, options.output);
        console.log(chalk.blue(`JSON report saved to ${options.output}`));
      } else if (options.output?.endsWith(".html")) {
        await writeHtmlReport(result, options.output);
        console.log(chalk.blue(`HTML report saved to ${options.output}`));
      } else {
        printConsoleReport(result);
      }
    } catch (err) {
      spinner.fail(chalk.red("Analysis failed."));
      console.error(err);
      process.exit(1);
    }
  });
```

#### CLI Usage Examples

```bash
# Basic analysis of current repo
Git Compass analyze

# Specific branch and time window
Git Compass analyze --branch main --window 90d

# Export to JSON
Git Compass analyze --output report.json

# Export to HTML
Git Compass analyze --output report.html

# With AI summary
Git Compass analyze --ai

# Natural language query
Git Compass query "Who changed the auth module last month?"

# Install pre-push risk hook
Git Compass hook install

# Watch mode (re-analyzes on new commits)
Git Compass watch
```

---

### 3.3 `@git-compass/web` — Next.js Dashboard

A local-served Next.js app that visualizes the analysis data.

#### Directory Structure

```
packages/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # dashboard home
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── analyze/route.ts        # POST — runs analysis
│   │   │   ├── query/route.ts          # POST — NL query
│   │   │   └── report/[id]/route.ts    # GET — fetch saved report
│   │   ├── hotspots/page.tsx
│   │   ├── churn/page.tsx
│   │   ├── contributors/page.tsx
│   │   └── compass/page.tsx
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── charts/
│   │   │   ├── ChurnChart.tsx
│   │   │   ├── HotspotHeatmap.tsx
│   │   │   ├── ContributorTimeline.tsx
│   │   │   └── RiskScoreBadge.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── NLQueryBox.tsx
│   │   └── AISummaryCard.tsx
│   ├── lib/
│   │   ├── api.ts                      # fetch helpers
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
├── next.config.ts
├── tailwind.config.ts
├── components.json                     # shadcn config
└── package.json
```

#### `package.json`

```json
{
  "name": "@git-compass/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 4321",
    "build": "next build",
    "start": "next start --port 4321",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@git-compass/core": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

#### `src/app/api/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GitParser, analyzeHotspots, computeRiskScores, analyzeChurn, analyzeContributors, analyzeBurnout } from "@git-compass/core";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      repoPath: string;
      branch?: string;
      window?: string;
      maxCommits?: number;
    };

    const { repoPath, branch = "HEAD", window = "30d", maxCommits = 500 } = body;

    const parser = new GitParser(repoPath);

    if (!(await parser.isValidRepo())) {
      return NextResponse.json({ error: "Not a valid Git repository" }, { status: 400 });
    }

    const commits = await parser.getCommits({ branch, window, maxCount: maxCommits });
    const hotspots = analyzeHotspots(commits, window as "7d" | "30d" | "90d" | "1y");
    const riskScores = computeRiskScores(hotspots);
    const churn = analyzeChurn(commits, window as "7d" | "30d" | "90d" | "1y");
    const contributors = analyzeContributors(commits);
    const burnout = analyzeBurnout(commits);

    return NextResponse.json({
      meta: { repoPath, branch, window, commitCount: commits.length, generatedAt: new Date() },
      hotspots,
      riskScores,
      churn,
      contributors,
      burnout,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
```

#### `src/components/charts/HotspotHeatmap.tsx`

```typescript
"use client";

import { Treemap, ResponsiveContainer } from "recharts";
import type { HotspotFile } from "@git-compass/core";

interface Props {
  hotspots: HotspotFile[];
}

const RISK_COLORS = {
  critical: "#E24B4A",
  high: "#EF9F27",
  medium: "#378ADD",
  low: "#1D9E75",
} as const;

export function HotspotHeatmap({ hotspots }: Props) {
  const data = hotspots.slice(0, 30).map((h) => ({
    name: h.path.split("/").pop() ?? h.path,
    fullPath: h.path,
    size: h.changeCount,
    fill: RISK_COLORS[h.riskLevel ?? "low"],
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        content={<CustomContent />}
      />
    </ResponsiveContainer>
  );
}

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, fill } = props as {
    x: number; y: number; width: number; height: number; name: string; fill: string;
  };

  if (width < 30 || height < 20) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.85} rx={4} />
      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill="white"
          fontWeight={500}
        >
          {name.length > 20 ? name.slice(0, 18) + "…" : name}
        </text>
      )}
    </g>
  );
}
```

#### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allows importing from workspace packages
  transpilePackages: ["@git-compass/core"],
};

export default nextConfig;
```

---

### 3.4 `@git-compass/vscode` — VS Code Extension

Integrates insights directly into VS Code via the Extension API.

#### Directory Structure

```
packages/vscode/
├── src/
│   ├── extension.ts            # activation entry point
│   ├── providers/
│   │   ├── SidebarProvider.ts  # webview panel (activity bar)
│   │   ├── DecorationProvider.ts # inline risk score decorations
│   │   └── CodeLensProvider.ts # per-file lens showing churn
│   ├── commands/
│   │   ├── analyze.ts          # command: Git Compass.analyze
│   │   ├── openDashboard.ts    # opens the web dashboard
│   │   └── compassMode.ts      # onboarding map command
│   ├── webview/
│   │   ├── panel.ts            # webview HTML builder
│   │   └── assets/             # bundled chart JS
│   └── utils/
│       ├── runner.ts           # invokes @git-compass/cli via child_process
│       └── config.ts
├── package.json                # extension manifest
├── tsconfig.json
└── webpack.config.js           # bundles the extension
```

#### `package.json` (extension manifest)

```json
{
  "name": "Git Compass",
  "displayName": "Git Compass",
  "description": "Git analytics and insights inside VS Code",
  "version": "0.1.0",
  "engines": { "vscode": "^1.90.0" },
  "categories": ["Other", "Visualization"],
  "activationEvents": ["workspaceContains:.git"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "Git Compass.analyze", "title": "Git Compass: Analyze Repository" },
      { "command": "Git Compass.openDashboard", "title": "Git Compass: Open Dashboard" },
      { "command": "Git Compass.compassMode", "title": "Git Compass: Compass Mode (Onboarding)" },
      { "command": "Git Compass.clearDecorations", "title": "Git Compass: Clear Risk Decorations" }
    ],
    "viewsContainers": {
      "activitybar": [
        { "id": "Git Compass", "title": "Git Compass", "icon": "$(git-branch)" }
      ]
    },
    "views": {
      "Git Compass": [
        { "id": "Git Compass.sidebar", "name": "Insights", "type": "webview" }
      ]
    },
    "configuration": {
      "title": "Git Compass",
      "properties": {
        "Git Compass.defaultWindow": {
          "type": "string",
          "default": "30d",
          "enum": ["7d", "30d", "90d", "1y"],
          "description": "Default analysis time window"
        },
        "Git Compass.enableDecorations": {
          "type": "boolean",
          "default": true,
          "description": "Show risk score decorations in the editor"
        },
        "Git Compass.anthropicApiKey": {
          "type": "string",
          "default": "",
          "description": "Anthropic API key for AI summaries (optional)"
        }
      }
    }
  },
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "dependencies": {
    "@git-compass/core": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "^1.90.0",
    "@vscode/vsce": "^2.27.0",
    "webpack": "^5.91.0",
    "ts-loader": "^9.5.0"
  }
}
```

#### `src/extension.ts`

```typescript
import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider.js";
import { DecorationProvider } from "./providers/DecorationProvider.js";
import { registerAnalyzeCommand } from "./commands/analyze.js";
import { registerDashboardCommand } from "./commands/openDashboard.js";
import { registerCompassCommand } from "./commands/compassMode.js";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  const decorationProvider = new DecorationProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("Git Compass.sidebar", sidebarProvider),
    registerAnalyzeCommand(sidebarProvider, decorationProvider),
    registerDashboardCommand(),
    registerCompassCommand(),
    vscode.workspace.onDidSaveTextDocument(() => {
      // Auto-refresh decorations on save if enabled
      const config = vscode.workspace.getConfiguration("Git Compass");
      if (config.get("enableDecorations")) {
        decorationProvider.refresh();
      }
    })
  );
}

export function deactivate() {}
```

#### `src/utils/runner.ts`

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AnalysisResult } from "@git-compass/core";

const execFileAsync = promisify(execFile);

export async function runAnalysis(
  repoPath: string,
  options: { branch?: string; window?: string; maxCommits?: number } = {}
): Promise<AnalysisResult> {
  const args = [
    "analyze",
    "--path", repoPath,
    "--output", "/tmp/Git Compass-result.json",
    "--branch", options.branch ?? "HEAD",
    "--window", options.window ?? "30d",
  ];

  await execFileAsync("Git Compass", args);

  const { readFile } = await import("node:fs/promises");
  const raw = await readFile("/tmp/Git Compass-result.json", "utf-8");
  return JSON.parse(raw) as AnalysisResult;
}
```

---

## 4. Data Models & Interfaces

All shared types live in `@git-compass/core/src/types.ts`.

```typescript
// ─── Raw Git Data ───────────────────────────────────────────────────────────

export interface RawCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  body: string;
  diff: unknown | null;
}

export type AnalysisWindow = "7d" | "30d" | "90d" | "1y";

export interface ParseOptions {
  branch?: string;
  window?: AnalysisWindow;
  maxCount?: number;
  since?: string;
  until?: string;
}

// ─── Analysis Outputs ────────────────────────────────────────────────────────

export interface HotspotFile {
  path: string;
  changeCount: number;
  uniqueAuthors: number;
  lastChanged: Date;
  riskScore: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
}

export interface RiskScore {
  path: string;
  score: number;           // 0–100
  level: "low" | "medium" | "high" | "critical";
  factors: {
    changeFrequency: number;
    uniqueAuthors: number;
    recentActivity: number;
  };
}

export interface ChurnDataPoint {
  date: Date;
  linesAdded: number;
  linesRemoved: number;
  netChurn: number;
  commitCount: number;
}

export interface ContributorStats {
  author: string;
  email: string;
  commitCount: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  firstCommit: Date;
  lastCommit: Date;
  activeDays: number;
}

export interface BurnoutAnalysis {
  flags: string[];
  afterHoursCommits: number;    // commits between 22:00 and 06:00
  weekendCommits: number;
  contributors: BurnoutContributor[];
}

export interface BurnoutContributor {
  author: string;
  afterHoursPercent: number;
  weekendPercent: number;
  riskLevel: "low" | "medium" | "high";
}

export interface CompassEntry {
  path: string;
  priority: number;         // 1 = read first
  reason: string;           // e.g., "High centrality, touched by all contributors"
  changeCount: number;
  type: "entry-point" | "core" | "config" | "test";
}

export interface AISummary {
  digest: string;
  generatedAt: Date;
  model: string;
}

// ─── Full Analysis Result ────────────────────────────────────────────────────

export interface AnalysisResult {
  meta: {
    repoPath: string;
    branch: string;
    window: string;
    commitCount: number;
    generatedAt: Date;
  };
  hotspots: HotspotFile[];
  riskScores: RiskScore[];
  churn: ChurnDataPoint[];
  contributors: ContributorStats[];
  burnout: BurnoutAnalysis;
  compass?: CompassEntry[];
  aiSummary?: AISummary | null;
}
```

---

## 5. API Design

The Next.js web dashboard exposes these API routes (also usable by the VS Code extension directly if the web server is running locally).

### POST `/api/analyze`

Run a fresh analysis on a local repository.

**Request body:**
```json
{
  "repoPath": "/Users/you/projects/myapp",
  "branch": "main",
  "window": "30d",
  "maxCommits": 500
}
```

**Response:** `AnalysisResult` JSON object.

---

### POST `/api/query`

Ask a natural language question about the repository.

**Request body:**
```json
{
  "question": "Who changed the auth module most last month?",
  "analysisId": "abc123"
}
```

**Response:**
```json
{
  "answer": "The auth module was primarily changed by Jane Smith (12 commits) and Bob Lee (7 commits) in the last 30 days..."
}
```

---

### GET `/api/report/[id]`

Retrieve a previously saved analysis by ID.

---

## 6. Feature Implementation Guide

### Feature: Pre-push Git Hook

Install with `Git Compass hook install`. Creates `.git/hooks/pre-push`:

```bash
#!/bin/sh
echo "Git Compass: running risk analysis on push..."
Git Compass analyze --window 7d --output /tmp/Git Compass-push.json --quiet

RISK_COUNT=$(node -e "
  const r = require('/tmp/Git Compass-push.json');
  console.log(r.riskScores.filter(s => s.level === 'critical').length);
")

if [ "$RISK_COUNT" -gt "0" ]; then
  echo "⚠ Git Compass: $RISK_COUNT critical-risk files in this push."
  echo "Run 'Git Compass report' to review. Push aborted."
  exit 1
fi
```

---

### Feature: Compass (Onboarding) Mode

`src/analyzers/compass.ts` — prioritizes files for new developers to read first.

```typescript
import type { RawCommit, CompassEntry } from "../types.js";

export function buildCompassMap(commits: RawCommit[]): CompassEntry[] {
  const fileCentrality = new Map<string, { authors: Set<string>; changes: number }>();

  for (const commit of commits) {
    const files = extractFiles(commit.diff);
    for (const file of files) {
      const e = fileCentrality.get(file) ?? { authors: new Set(), changes: 0 };
      e.authors.add(commit.author);
      e.changes++;
      fileCentrality.set(file, e);
    }
  }

  const entries: CompassEntry[] = [];

  for (const [path, data] of fileCentrality.entries()) {
    const type = inferFileType(path);
    const priority = scoreForOnboarding(path, data.authors.size, data.changes, type);
    entries.push({
      path,
      priority,
      reason: buildReason(type, data.authors.size, data.changes),
      changeCount: data.changes,
      type,
    });
  }

  return entries.sort((a, b) => b.priority - a.priority).slice(0, 20);
}

function inferFileType(path: string): CompassEntry["type"] {
  if (/index\.(ts|js|tsx|jsx)$/.test(path)) return "entry-point";
  if (/\.(config|env|json)/.test(path)) return "config";
  if (/\.(test|spec)\.(ts|js)$/.test(path)) return "test";
  return "core";
}

function scoreForOnboarding(
  path: string,
  authorCount: number,
  changes: number,
  type: CompassEntry["type"]
): number {
  const typeBonus = { "entry-point": 40, "core": 20, "config": 10, "test": 5 }[type];
  const authorBonus = Math.min(authorCount * 5, 30);
  const changeBonus = Math.min(changes * 2, 30);
  return typeBonus + authorBonus + changeBonus;
}

function buildReason(type: CompassEntry["type"], authors: number, changes: number): string {
  const typeLabel = { "entry-point": "Entry point", "core": "Core module", "config": "Config file", "test": "Test file" }[type];
  return `${typeLabel} · ${authors} contributor${authors !== 1 ? "s" : ""} · ${changes} changes`;
}

function extractFiles(diff: unknown): string[] {
  if (!diff || typeof diff !== "object") return [];
  return (diff as { files?: Array<{ file: string }> }).files?.map((f) => f.file) ?? [];
}
```

---

### Feature: Burnout Detector

`src/analyzers/burnout.ts`

```typescript
import type { RawCommit, BurnoutAnalysis, BurnoutContributor } from "../types.js";

const AFTER_HOURS_START = 22; // 10 PM
const AFTER_HOURS_END = 6;    // 6 AM

export function analyzeBurnout(commits: RawCommit[]): BurnoutAnalysis {
  const byAuthor = groupByAuthor(commits);
  const contributors: BurnoutContributor[] = [];
  const globalFlags: string[] = [];

  for (const [author, authorCommits] of byAuthor.entries()) {
    const afterHours = authorCommits.filter((c) => isAfterHours(c.date)).length;
    const weekend = authorCommits.filter((c) => isWeekend(c.date)).length;
    const total = authorCommits.length;

    const afterHoursPercent = Math.round((afterHours / total) * 100);
    const weekendPercent = Math.round((weekend / total) * 100);

    const riskLevel =
      afterHoursPercent > 40 || weekendPercent > 50 ? "high" :
      afterHoursPercent > 20 || weekendPercent > 25 ? "medium" : "low";

    contributors.push({ author, afterHoursPercent, weekendPercent, riskLevel });

    if (riskLevel === "high") {
      globalFlags.push(`${author}: ${afterHoursPercent}% after-hours commits`);
    }
  }

  const totalAfterHours = commits.filter((c) => isAfterHours(c.date)).length;
  const totalWeekend = commits.filter((c) => isWeekend(c.date)).length;

  return {
    flags: globalFlags,
    afterHoursCommits: totalAfterHours,
    weekendCommits: totalWeekend,
    contributors,
  };
}

function isAfterHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function groupByAuthor(commits: RawCommit[]): Map<string, RawCommit[]> {
  const map = new Map<string, RawCommit[]>();
  for (const commit of commits) {
    const existing = map.get(commit.author) ?? [];
    existing.push(commit);
    map.set(commit.author, existing);
  }
  return map;
}
```

---

## 7. Environment & Config

### `.gitcompasrc` (project-level config, JSON)

```json
{
  "branch": "main",
  "window": "30d",
  "maxCommits": 500,
  "excludeFiles": ["package-lock.json", "pnpm-lock.yaml", "*.min.js"],
  "excludeAuthors": ["dependabot[bot]", "renovate[bot]"],
  "ai": {
    "enabled": false,
    "model": "claude-sonnet-4-20250514"
  }
}
```

### Environment Variables

```bash
# Required for AI features only
ANTHROPIC_API_KEY=sk-ant-...

# Optional: custom web dashboard port
GITCOMPAS_WEB_PORT=4321
```

---

## 8. Testing Strategy

Use **Vitest** across all packages. Place tests in `__tests__/` directories alongside source files.

### Unit Tests (core package)

```typescript
// packages/core/__tests__/risk.test.ts
import { describe, it, expect } from "vitest";
import { computeRiskScores } from "../src/analyzers/risk.js";
import type { HotspotFile } from "../src/types.js";

const mockHotspots: HotspotFile[] = [
  { path: "src/auth.ts", changeCount: 50, uniqueAuthors: 8, lastChanged: new Date(), riskScore: 0 },
  { path: "src/utils.ts", changeCount: 5, uniqueAuthors: 2, lastChanged: new Date(Date.now() - 60 * 86400000), riskScore: 0 },
];

describe("computeRiskScores", () => {
  it("assigns higher risk to files with more changes and authors", () => {
    const scores = computeRiskScores(mockHotspots);
    const auth = scores.find((s) => s.path === "src/auth.ts")!;
    const utils = scores.find((s) => s.path === "src/utils.ts")!;
    expect(auth.score).toBeGreaterThan(utils.score);
  });

  it("returns scores in 0–100 range", () => {
    const scores = computeRiskScores(mockHotspots);
    for (const score of scores) {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    }
  });

  it("assigns correct risk level", () => {
    const scores = computeRiskScores(mockHotspots);
    const auth = scores.find((s) => s.path === "src/auth.ts")!;
    expect(["high", "critical"]).toContain(auth.level);
  });
});
```

### Integration Tests (CLI)

```typescript
// packages/cli/__tests__/analyze.test.ts
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

describe("Git Compass analyze", () => {
  it("runs successfully on the monorepo itself", async () => {
    const { stdout } = await exec("node", [
      "packages/cli/dist/index.js",
      "analyze",
      "--path", process.cwd(),
      "--output", "/tmp/test-report.json",
    ]);
    expect(stdout).toContain("Analysis complete");
  });
});
```

---

## 9. CI/CD & Publishing

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm type-check
      - run: pnpm lint
```

### `.github/workflows/publish-cli.yml`

```yaml
name: Publish CLI to npm

on:
  push:
    tags: ["cli-v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: pnpm install && pnpm build
      - run: pnpm --filter @git-compass/cli publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 10. Phased Implementation Order

Work through these phases sequentially. Each phase produces something working and usable.

### Phase 1 — Foundation (Week 1–2)
- [ ] Initialize monorepo: `pnpm init`, workspace setup, Turborepo config
- [ ] Create shared `tsconfig` and ESLint config in `tooling/`
- [ ] Scaffold `@git-compass/core` package structure
- [ ] Implement `GitParser` with `simple-git`
- [ ] Define all TypeScript interfaces in `types.ts`
- [ ] Write unit tests for parser
- [ ] Set up Vitest across packages
- [ ] Configure GitHub Actions CI

### Phase 2 — Analytics Engine (Week 3–5)
- [ ] Implement `analyzeHotspots()`
- [ ] Implement `analyzeChurn()`
- [ ] Implement `computeRiskScores()`
- [ ] Implement `analyzeContributors()`
- [ ] Implement `analyzeBurnout()`
- [ ] Implement `buildCompassMap()`
- [ ] Write unit tests for each analyzer
- [ ] Export clean public API from `index.ts`

### Phase 3 — CLI (Week 6–7)
- [ ] Scaffold `@git-compass/cli` with Commander.js
- [ ] Implement `analyze` command
- [ ] Implement `report` command (JSON + HTML output)
- [ ] Implement `query` command (NL querying)
- [ ] Implement `watch` command (polling mode)
- [ ] Implement `hook install/uninstall` command
- [ ] Add `.gitcompasrc` config loading
- [ ] Polish terminal output with chalk + ora
- [ ] Publish to npm

### Phase 4 — Web Dashboard (Week 8–9)
- [ ] Scaffold Next.js app in `@git-compass/web`
- [ ] Install and configure shadcn/ui + Tailwind
- [ ] Build `POST /api/analyze` route
- [ ] Build `POST /api/query` route
- [ ] Build sidebar navigation layout
- [ ] Build `HotspotHeatmap` component (Recharts Treemap)
- [ ] Build `ChurnChart` component (Recharts LineChart)
- [ ] Build `ContributorTimeline` component
- [ ] Build `AISummaryCard` component
- [ ] Build `NLQueryBox` component
- [ ] Compass Mode page (`/compass`)

### Phase 5 — VS Code Extension (Week 10–12)
- [ ] Scaffold extension in `@git-compass/vscode`
- [ ] Configure webpack bundler
- [ ] Implement `SidebarProvider` (webview panel)
- [ ] Implement `DecorationProvider` (inline risk indicators)
- [ ] Implement `CodeLensProvider` (per-file churn lens)
- [ ] Register all commands
- [ ] Wire up `runner.ts` to invoke CLI
- [ ] Package and publish to VS Code Marketplace

### Phase 6 — AI & Advanced (Week 13+)
- [ ] Implement `AISummarizer` with Anthropic SDK
- [ ] Implement `nl-query.ts` for natural language questions
- [ ] Add `--ai` flag to CLI `analyze` command
- [ ] Integrate AI summary into web dashboard
- [ ] Integrate AI query into VS Code sidebar
- [ ] Add burnout alerts to VS Code notifications
- [ ] CI/CD PR risk comment via GitHub Actions

---

## Quick Start (after scaffolding)

```bash
# Clone and install
git clone https://github.com/yourname/Git Compass.git
cd Git Compass
pnpm install

# Build all packages
pnpm build

# Run the CLI on any local repo
node packages/cli/dist/index.js analyze --path /path/to/your/repo

# Start the web dashboard
pnpm --filter @git-compass/web dev
# Open http://localhost:4321

# Run tests
pnpm test
```

---

*This document was generated for Git Compass v0.1.0. Update version numbers and model strings as the project evolves.*


