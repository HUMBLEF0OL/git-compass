import type { ISODateString, WindowDays } from './analytics.js';
import type { GitCommit, FilterPipelineOptions } from './signal.js';

// ─── Incremental Analysis ─────────────────────────────────────────────────────

/**
 * A cached baseline of a previous full analysis run.
 * Stored and restored by the caller — core has no opinion on persistence.
 */
export interface AnalysisBaseline {
  /** SHA of the most recent commit included in this baseline */
  readonly headCommitHash: string;
  /** ISO date of the most recent commit included in this baseline */
  readonly headCommitDate: ISODateString;
  /** The full commit array that produced this baseline */
  readonly commits: GitCommit[];
  /** When this baseline was computed */
  readonly computedAt: ISODateString;
  /** The window used when this baseline was computed */
  readonly windowDays: WindowDays;
}

export interface IncrementalContext {
  /**
   * The merged commit array: baseline.commits + new commits, deduplicated by hash,
   * sorted by date descending, capped to windowDays from the most recent commit date.
   */
  readonly mergedCommits: GitCommit[];
  /** Commits that are new since the baseline */
  readonly newCommits: GitCommit[];
  /** The updated baseline, ready to be persisted for the next incremental run */
  readonly updatedBaseline: AnalysisBaseline;
  /** True if any new commits were found */
  readonly hasNewData: boolean;
}

export interface IncrementalOptions {
  /** Git SHA or ISO date string. Commits after this point are considered new. */
  since: string;
  /** The previously persisted baseline. If not provided, treats the full window as new. */
  baseline?: AnalysisBaseline;
  filterOptions?: FilterPipelineOptions;
  windowDays?: WindowDays;
}

// ─── Pipeline Composition ─────────────────────────────────────────────────────

/**
 * A single pipeline step.
 * Takes the accumulated result of all previous steps and returns an enriched version.
 * May be sync or async.
 */
export type PipelineStep<TIn, TOut> = (input: TIn) => TOut | Promise<TOut>;

/**
 * The result of compose() — a callable that runs all steps in sequence.
 */
export interface ComposedPipeline<TIn, TOut> {
  (input: TIn): Promise<TOut>;
  /** The number of steps in this pipeline */
  readonly stepCount: number;
}

// ─── Serializable Snapshots ───────────────────────────────────────────────────

export interface SnapshotEnvelope {
  /** Schema version — used to detect stale snapshots */
  readonly version: '1.0';
  readonly serializedAt: ISODateString;
  /** The raw analytics result, JSON-encoded */
  readonly payload: string;
  /**
   * SHA-256-like checksum of the payload string.
   * Computed with a simple djb2 hash (no crypto dependency).
   * Used to detect corruption on deserialization.
   */
  readonly checksum: string;
}

export interface DeserializeOptions {
  /**
   * If true, skip checksum validation.
   * Use only when checksum is known to be unavailable (legacy snapshots).
   */
  skipChecksumValidation?: boolean;
}

/** Thrown when a snapshot fails checksum validation */
export class SnapshotCorruptionError extends Error {
  constructor(
    public readonly expected: string,
    public readonly actual: string,
  ) {
    super(`Snapshot checksum mismatch. Expected: ${expected}, got: ${actual}`);
    this.name = 'SnapshotCorruptionError';
  }
}

/** Thrown when a snapshot has an unrecognised schema version */
export class SnapshotVersionError extends Error {
  constructor(public readonly found: string) {
    super(`Unsupported snapshot version: ${found}. Expected: 1.0`);
    this.name = 'SnapshotVersionError';
  }
}
