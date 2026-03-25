import { GitCommit, SignalIntegrityReport, NoiseSummary, NoiseReason } from '../types/signal.js';
import { classifyCommit } from '../parser/commitClassifier.js';

const ANALYZER_SENSITIVITY: Record<string, string[]> = {
  bot_author:      ['hotspots', 'contributors', 'burnout', 'ownershipDrift'],
  merge_commit:    ['hotspots', 'dependencyChurn'],
  revert_commit:   ['hotspots', 'risk'],
  release_commit:  ['hotspots', 'contributors'],
  lockfile_only:   ['hotspots', 'dependencyChurn', 'impact'],
};

/**
 * Computes a report on signal integrity after filtering.
 */
export function computeSignalIntegrity(unfilteredCommits: GitCommit[], cleanCommitsList: GitCommit[]): SignalIntegrityReport {
  const totalCommits = unfilteredCommits.length;
  if (totalCommits === 0) {
    return {
      totalCommits: 0,
      cleanCommits: 0,
      filteredOut: 0,
      noiseRatio: 0,
      topNoiseSources: [],
      affectedAnalyzers: [],
    };
  }

  const cleanCommits = cleanCommitsList.length;
  const filteredOut = totalCommits - cleanCommits;
  const noiseRatio = filteredOut / totalCommits;

  // Track filtered commits by hash
  const cleanHashes = new Set(cleanCommitsList.map(c => c.hash));
  const removedCommits = unfilteredCommits.filter(c => !cleanHashes.has(c.hash));


  const reasonCounts: Record<string, number> = {};
  const botOffenders: Record<string, number> = {};

  removedCommits.forEach(commit => {
    const classified = classifyCommit(commit);
    const reason = classified.noiseReason || 'unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

    if (reason === 'bot_author') {
      const botName = commit.author.name;
      botOffenders[botName] = (botOffenders[botName] || 0) + 1;
    }
  });

  const topNoiseSources: NoiseSummary[] = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => {
      let topOffender: string | null = null;
      if (reason === 'bot_author') {
        topOffender = Object.entries(botOffenders)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
      }
      return { reason, count, topOffender };
    });

  const affectedAnalyzersSet = new Set<string>();
  Object.keys(reasonCounts).forEach(reason => {
    const sensitive = ANALYZER_SENSITIVITY[reason];
    if (sensitive) {
      sensitive.forEach(analyzer => affectedAnalyzersSet.add(analyzer));
    }
  });

  const affectedAnalyzers = Array.from(affectedAnalyzersSet).sort();

  return {
    totalCommits,
    cleanCommits,
    filteredOut,
    noiseRatio,
    topNoiseSources,
    affectedAnalyzers,
  };
}
