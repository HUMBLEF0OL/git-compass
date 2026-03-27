export type CommitType =
  | 'feat'
  | 'fix'
  | 'chore'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'test'
  | 'perf'
  | 'merge'
  | 'revert'
  | 'release'
  | 'bot'
  | 'unknown';

export type NoiseReason =
  | 'bot_author'
  | 'merge_commit'
  | 'revert_commit'
  | 'release_commit'
  | 'lockfile_only'
  | null;

export interface ClassifiedCommit {
  /** Original commit object — never mutated */
  readonly commit: GitCommit;
  readonly type: CommitType;
  readonly isNoise: boolean;
  readonly noiseReason: NoiseReason;
}

export type FileCategory =
  | 'source'
  | 'config'
  | 'lockfile'
  | 'generated'
  | 'test'
  | 'docs'
  | 'asset'
  | 'ci';

export interface ClassifiedFile {
  readonly filePath: string;
  readonly category: FileCategory;
  /** True only for: lockfile, generated, asset. Config/ci/docs are NOT noise by default. */
  readonly isNoise: boolean;
  readonly noiseReason: string | null;
}

export interface FilterPipelineOptions {
  /** Commit types to exclude. Defaults: ['merge', 'bot'] */
  excludeCommitTypes?: CommitType[];
  /** File categories to exclude. Defaults: ['lockfile', 'generated', 'asset'] */
  excludeFileCategories?: FileCategory[];
  /** Glob-style patterns (existing API). Applied after category filtering. */
  excludePatterns?: string[];
  /** Additional bot author name/email substrings to match */
  customBotPatterns?: string[];
  /**
   * Identity map for contributor deduplication.
   * Key: alias email. Value: canonical email.
   * e.g. { 'john@personal.com': 'john@company.com' }
   */
  identityMap?: Record<string, string>;
}

export interface FilterPipeline {
  filter(commits: GitCommit[]): GitCommit[];
  classifyCommit(commit: GitCommit): ClassifiedCommit;
  classifyFile(filePath: string): ClassifiedFile;
}

export interface NoiseSummary {
  readonly reason: NoiseReason | string;
  readonly count: number;
  /** Top offender — bot name, file path, etc. */
  readonly topOffender: string | null;
}

export interface SignalIntegrityReport {
  readonly totalCommits: number;
  readonly cleanCommits: number;
  readonly filteredOut: number;
  readonly noiseRatio: number;           // 0–1 float
  readonly topNoiseSources: NoiseSummary[];
  /** Which existing analyzers are most affected by the removed noise */
  readonly affectedAnalyzers: string[];
}

export interface CanonicalContributor {
  readonly canonicalEmail: string;
  readonly canonicalName: string;
  readonly aliases: string[];            // all other emails that map to this identity
}

export interface DeduplicationResult {
  readonly canonical: CanonicalContributor[];
  readonly botsRemoved: string[];        // email list
}

/**
 * Minimal GitCommit shape. Use the actual type from gitParser.ts if it exists.
 * This is the fallback if no type is exported from gitParser.ts.
 */
export interface GitCommit {
  readonly hash: string;
  readonly message: string;
  readonly author: {
    readonly name: string;
    readonly email: string;
  };
  readonly date: string;
  readonly parents: string[];
  readonly files: string[];
  readonly insertions: number;
  readonly deletions: number;
}
