import type { GitCommit } from '../types/signal.js';
import type { WindowDays } from '../types/analytics.js';
import type { 
  AnalysisBaseline, 
  IncrementalContext, 
  IncrementalOptions 
} from '../types/infrastructure.js';
import { createFilterPipeline } from '../parser/filterPipeline.js';

/**
 * Pure function. Receives pre-fetched newCommits and merges them with a baseline.
 */
export function createIncrementalContext(
  newCommits: GitCommit[], 
  options: IncrementalOptions
): IncrementalContext {
  // 1. Filter newCommits
  const pipeline = createFilterPipeline(options.filterOptions);
  const filteredNewCommits = pipeline.filter(newCommits);

  // 2. Resolve windowDays
  const windowDays = options.windowDays ?? options.baseline?.windowDays ?? 30;

  // 3. Merge with baseline
  let mergedCommits: GitCommit[] = [];
  if (options.baseline) {
    // Deduplicate by hash — keep new commits first (precedence)
    const commitMap = new Map<string, GitCommit>();
    
    // Process new commits first
    for (const commit of filteredNewCommits) {
      if (!commitMap.has(commit.hash)) {
        commitMap.set(commit.hash, commit);
      }
    }
    
    // Process baseline commits only if hash not already present
    for (const commit of options.baseline.commits) {
      if (!commitMap.has(commit.hash)) {
        commitMap.set(commit.hash, commit);
      }
    }
    
    mergedCommits = Array.from(commitMap.values());
  } else {
    mergedCommits = [...filteredNewCommits];
  }

  // Sort by date descending
  mergedCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Cap to windowDays from most recent commit date
  if (mergedCommits.length > 0) {
    const mostRecentDate = new Date(mergedCommits[0]!.date);
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    mergedCommits = mergedCommits.filter(commit => new Date(commit.date) >= cutoffDate);
  }

  // 4. hasNewData
  const hasNewData = filteredNewCommits.length > 0;

  // 5. updatedBaseline
  const headCommit = mergedCommits[0];
  const updatedBaseline: AnalysisBaseline = {
    headCommitHash: headCommit?.hash ?? '',
    headCommitDate: headCommit?.date ?? '',
    commits: mergedCommits,
    computedAt: new Date().toISOString(),
    windowDays
  };

  return {
    mergedCommits,
    newCommits: filteredNewCommits,
    updatedBaseline,
    hasNewData
  };
}

/**
 * Pure function. Merges two baselines into one.
 */
export function mergeBaselines(
  baselineA: AnalysisBaseline, 
  baselineB: AnalysisBaseline, 
  windowDays: WindowDays
): AnalysisBaseline {
  const commitMap = new Map<string, GitCommit>();
  
  // Combine both sets
  for (const commit of [...baselineA.commits, ...baselineB.commits]) {
    if (!commitMap.has(commit.hash)) {
      commitMap.set(commit.hash, commit);
    }
  }

  const merged = Array.from(commitMap.values());
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let finalCommits = merged;
  if (merged.length > 0) {
    const mostRecentDate = new Date(merged[0]!.date);
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    finalCommits = merged.filter(commit => new Date(commit.date) >= cutoffDate);
  }

  const headCommit = finalCommits[0];
  return {
    headCommitHash: headCommit?.hash ?? '',
    headCommitDate: headCommit?.date ?? '',
    commits: finalCommits,
    computedAt: new Date().toISOString(),
    windowDays
  };
}
