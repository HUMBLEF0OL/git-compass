import type { GitCommit } from '../types/signal.js';
import type { 
  CouplingStrength, 
  CouplingDrift, 
  DependencyChurnReport, 
  CouplingTrend 
} from '../types/insights.js';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Correlates file changes to detect coupling.
 */
export function correlateChangeFrequency(
  commits: GitCommit[], 
  options: { minCouplingScore?: number } = {}
): CouplingStrength[] {
  const { minCouplingScore = 0.3 } = options;
  
  const midPoint = Math.floor(commits.length / 2);
  const sortedCommits = [...commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const fileCommitCounts: Record<string, number> = {};
  const coChangeCounts: Record<string, { total: number; early: number; late: number }> = {};

  sortedCommits.forEach((c, idx) => {
    // Skip if only 1 file or > 50 files
    if (c.files.length <= 1 || c.files.length > 50) {
      // Still need to count individual files for totalCommitsTouching
      c.files.forEach(f => {
        fileCommitCounts[f] = (fileCommitCounts[f] || 0) + 1;
      });
      return;
    }

    const isEarly = idx < midPoint;

    for (let i = 0; i < c.files.length; i++) {
      const fileA = c.files[i]!;
      fileCommitCounts[fileA] = (fileCommitCounts[fileA] || 0) + 1;

      for (let j = i + 1; j < c.files.length; j++) {
        const fileB = c.files[j]!;
        const pairKey = fileA < fileB ? `${fileA}|${fileB}` : `${fileB}|${fileA}`;
        
        if (!coChangeCounts[pairKey]) {
          coChangeCounts[pairKey] = { total: 0, early: 0, late: 0 };
        }
        coChangeCounts[pairKey].total++;
        if (isEarly) coChangeCounts[pairKey].early++;
        else coChangeCounts[pairKey].late++;
      }
    }
  });

  const results: CouplingStrength[] = [];

  Object.entries(coChangeCounts).forEach(([pairKey, counts]) => {
    const [fileA, fileB] = pairKey.split('|') as [string, string];
    const totalA = fileCommitCounts[fileA] || 0;
    const totalB = fileCommitCounts[fileB] || 0;
    
    // Jaccard: coChanges / (totalA + totalB - coChanges)
    const denominator = totalA + totalB - counts.total;
    const couplingScore = denominator === 0 ? 0 : counts.total / denominator;

    if (couplingScore >= minCouplingScore) {
      let trend: CouplingTrend = 'stable';
      if (counts.late > counts.early * 1.2) trend = 'strengthening';
      else if (counts.late < counts.early * 0.8) trend = 'weakening';

      results.push({
        fileA,
        fileB,
        couplingScore: round4(couplingScore),
        trend,
        earlyWindowCount: counts.early,
        lateWindowCount: counts.late,
      });
    }
  });

  return results.sort((a, b) => b.couplingScore - a.couplingScore);
}

/**
 * Detects how coupling has drifted between two commit windows.
 */
export function detectCouplingDrift(
  currentCommits: GitCommit[], 
  previousCommits: GitCommit[], 
  options: { minCouplingScore?: number } = {}
): CouplingDrift[] {
  // Use minCouplingScore: 0 for internal calls to get all pairs
  const current = correlateChangeFrequency(currentCommits, { minCouplingScore: 0 });
  const previous = correlateChangeFrequency(previousCommits, { minCouplingScore: 0 });

  const currentMap = new Map<string, number>();
  current.forEach(c => currentMap.set(`${c.fileA}|${c.fileB}`, c.couplingScore));

  const previousMap = new Map<string, number>();
  previous.forEach(p => previousMap.set(`${p.fileA}|${p.fileB}`, p.couplingScore));

  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const drifts: CouplingDrift[] = [];

  allKeys.forEach(key => {
    const [fileA, fileB] = key.split('|') as [string, string];
    const currentScore = currentMap.get(key) || 0;
    const previousScore = previousMap.get(key) || 0;
    const delta = currentScore - previousScore;

    let status: 'decoupled' | 'coupled' | 'unchanged' = 'unchanged';
    if (delta < -0.2) status = 'decoupled';
    else if (delta > 0.2) status = 'coupled';

    if (status !== 'unchanged') {
      drifts.push({
        fileA,
        fileB,
        previousScore: round4(previousScore),
        currentScore: round4(currentScore),
        delta: round4(delta),
        status,
      });
    }
  });

  return drifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Aggregates dependency churn metrics.
 */
export function analyzeDependencyChurn(
  commits: GitCommit[], 
  previousCommits?: GitCommit[], 
  options?: { minCouplingScore?: number }
): DependencyChurnReport {
  return {
    couplings: correlateChangeFrequency(commits, options),
    drifts: previousCommits ? detectCouplingDrift(commits, previousCommits, options) : [],
    analyzedAt: new Date().toISOString(),
  };
}
