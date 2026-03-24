import type { GitCommit } from '../types/signal.js';
import type { 
  VelocityWindow, 
  VelocityAnomaly, 
  ContributorVelocity, 
  DeliveryConsistency, 
  VelocityReport,
  WindowDays
} from '../types/analytics.js';

/**
 * Groups commits into time-based windows.
 * Pure function.
 */
export function computeVelocityWindows(commits: GitCommit[], windowDays: WindowDays): VelocityWindow[] {
  if (commits.length === 0) return [];

  // Sort a copy to avoid mutation
  const sorted = [...commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (sorted.length === 0) return [];
  const first = sorted[0] as GitCommit;
  const last = sorted[sorted.length - 1] as GitCommit;
  if (!first || !last) return [];

  const start = new Date(first.date).getTime();
  const end = new Date(last.date).getTime();
  const windowMs = windowDays * 86_400_000;

  const windows: VelocityWindow[] = [];
  let currentStart = start;

  while (currentStart <= end) {
    const currentEnd = currentStart + windowMs;
    const windowCommits = sorted.filter((c) => {
      const t = new Date(c.date).getTime();
      return t >= currentStart && t < currentEnd;
    });

    const activeContributors = new Set(windowCommits.map((c) => c.author.email)).size;
    const filesChanged = windowCommits.reduce((acc, c) => acc + c.files.length, 0);

    // Heuristics: GitCommit might not have linesAdded/linesRemoved
    const linesAdded = 0;
    const linesRemoved = 0;

    windows.push({
      windowStart: new Date(currentStart).toISOString(),
      windowEnd: new Date(currentEnd).toISOString(),
      commitCount: windowCommits.length,
      filesChanged,
      linesAdded,
      linesRemoved,
      activeContributors,
    });

    currentStart = currentEnd;
  }

  return windows;
}

/**
 * Semantic wrapper for velocity windows.
 */
export function computeVelocityTrend(commits: GitCommit[], windowDays: WindowDays): VelocityWindow[] {
  return computeVelocityWindows(commits, windowDays);
}

/**
 * Detects statistical anomalies in velocity windows.
 * Pure function.
 */
export function detectVelocityAnomalies(
  windows: VelocityWindow[], 
  options: { zScoreThreshold?: number } = {}
): VelocityAnomaly[] {
  if (windows.length === 0) return [];
  const { zScoreThreshold = 2.0 } = options;

  const counts = windows.map((w) => w.commitCount);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const stddev = Math.sqrt(counts.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / counts.length);

  return windows
    .map((w) => {
      const zScore = stddev === 0 ? 0 : (w.commitCount - mean) / stddev;
      let type: 'spike' | 'dip' | 'none' = 'none';
      if (zScore >= zScoreThreshold) type = 'spike';
      else if (zScore <= -zScoreThreshold) type = 'dip';

      const absZ = Math.abs(zScore).toFixed(1);
      const description = type === 'spike' 
        ? `Unusually high activity (${w.commitCount} commits, ${absZ}σ above mean)`
        : type === 'dip'
          ? `Unusually low activity (${w.commitCount} commits, ${absZ}σ below mean)`
          : '';

      return { window: w, type, zScore, description };
    })
    .filter((a) => a.type !== 'none')
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)) as VelocityAnomaly[];
}

/**
 * Computes velocity per contributor.
 * Pure function.
 */
export function computeContributorVelocity(commits: GitCommit[], windowDays: WindowDays): ContributorVelocity[] {
  if (commits.length === 0) return [];

  const byAuthor: Record<string, GitCommit[]> = {};
  commits.forEach((c) => {
    if (c && c.author && c.author.email) {
      if (!byAuthor[c.author.email]) {
        byAuthor[c.author.email] = [];
      }
      const authorCommits = byAuthor[c.author.email];
      if (authorCommits) {
        authorCommits.push(c);
      }
    }
  });

  return Object.entries(byAuthor)
    .map(([email, authorCommits]) => {
      const windows = computeVelocityWindows(authorCommits, windowDays);
      const counts = windows.map((w) => w.commitCount);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const stddev = Math.sqrt(counts.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / counts.length);
      const consistencyScore = mean === 0 ? 0 : stddev / mean;

      return {
        authorEmail: email,
        windows,
        avgCommitsPerWindow: mean,
        consistencyScore,
      };
    })
    .sort((a, b) => b.avgCommitsPerWindow - a.avgCommitsPerWindow);
}

/**
 * Analyzes team-wide delivery consistency.
 * Pure function.
 */
export function computeDeliveryConsistency(windows: VelocityWindow[]): DeliveryConsistency {
  const counts = windows.map((w) => w.commitCount);
  const mean = counts.length === 0 ? 0 : counts.reduce((a, b) => a + b, 0) / counts.length;
  const stddev = counts.length === 0 ? 0 : Math.sqrt(counts.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / counts.length);
  const teamConsistencyScore = mean === 0 ? 0 : stddev / mean;

  let rating: 'consistent' | 'variable' | 'erratic' = 'erratic';
  if (teamConsistencyScore < 0.3) rating = 'consistent';
  else if (teamConsistencyScore <= 0.6) rating = 'variable';

  return {
    teamConsistencyScore,
    rating,
    windowSummaries: windows,
  };
}

/**
 * Aggregates all velocity metrics.
 * Pure function.
 */
export function analyzeVelocity(
  commits: GitCommit[], 
  windowDays: WindowDays, 
  options: { zScoreThreshold?: number } = {}
): VelocityReport {
  const windows = computeVelocityWindows(commits, windowDays);
  return {
    windows,
    anomalies: detectVelocityAnomalies(windows, options),
    byContributor: computeContributorVelocity(commits, windowDays),
    teamConsistency: computeDeliveryConsistency(windows),
    analyzedAt: new Date().toISOString(),
  };
}
