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

export type AnalysisWindow = "7d" | "30d" | "90d" | "1y" | "all";

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

export enum AIProviderType {
  ANTHROPIC = "anthropic",
  OPENAI = "openai",
  GEMINI = "gemini",
}

export interface AIProvider {
  type: AIProviderType;
  generateSummary: (analysis: AnalysisResult) => Promise<AISummary>;
  query: (question: string, analysis: AnalysisResult) => Promise<string>;
}

export interface AISummary {
  digest: string;
  generatedAt: Date;
  model: string;
  provider: AIProviderType;
}

// ─── Deep Analytics ──────────────────────────────────────────────────────────

export interface CouplingLink {
  head: string;             // File A
  tail: string;             // File B
  coupling: number;         // 0–1 (percentage of shared commits)
  sharedCommits: number;
}

export interface KnowledgeSilo {
  path: string;
  mainContributor: string;
  authorshipPercent: number; // 0–100
  riskLevel: "low" | "medium" | "high";
}

export interface FileImpact {
  path: string;
  blastRadius: number;      // average files changed alongside this one
  maxBlastRadius: number;   // max files changed in a single commit with this one
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
  coupling: CouplingLink[];
  knowledge: KnowledgeSilo[];
  impact: FileImpact[];
  rot: string[];
  compass?: CompassEntry[];

  aiSummary?: AISummary | null;
}

