import type { GitCommit } from '../types/signal.js';
import type { 
  BranchInfo, 
  BranchLifecycle, 
  StaleBranch, 
  MergeFrequency, 
  BranchStatus 
} from '../types/analytics.js';

/**
 * Classifies branch statuses and computes lifecycle metrics.
 * Pure function.
 */
export function analyzeBranchLifecycles(
  branches: BranchInfo[],
  commits: GitCommit[],
  options: { staleThresholdDays?: number; defaultBranch?: string; now?: number } = {}
): BranchLifecycle[] {
  const { staleThresholdDays = 90, defaultBranch = 'main', now = Date.now() } = options;


  return branches.map((branch) => {
    // Find commits for this branch's author within the time range of this branch's activity
    // Heuristic: commits by this author between first and last commit of the branch
    // Since we don't have per-branch commit lists, we use the author email as a proxy.
    const authorCommits = commits
      .filter((c) => c && c.author && c.author.email === branch.lastCommitAuthor)
      .sort((a, b) => {
        const da = a?.date ? new Date(a.date).getTime() : 0;
        const db = b?.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });

    // firstCommitDate: the earliest commit date found for this branch author in the window.
    // If none found, use lastCommitDate (single-commit branch).
    const firstCommitDate = authorCommits.length > 0 && authorCommits[0] ? authorCommits[0].date : branch.lastCommitDate;

    // daysToMerge: scan commits for a merge commit whose message contains the branch name.
    let daysToMerge: number | null = null;
    const mergeCommit = commits.find((c) => {
      const msg = (c?.message || '').toLowerCase();
      return (
        (msg.startsWith('merge branch') || msg.startsWith('merge pull request')) &&
        msg.includes(branch.name.toLowerCase())
      );
    });

    if (mergeCommit) {
      const firstDate = new Date(firstCommitDate).getTime();
      const mergeDate = new Date(mergeCommit.date).getTime();
      daysToMerge = Math.max(0, Math.floor((mergeDate - firstDate) / 86_400_000));
    }

    const daysSinceLastCommit = Math.floor((now - new Date(branch.lastCommitDate).getTime()) / 86_400_000);
    const isAbandoned = daysSinceLastCommit > staleThresholdDays && daysToMerge === null;

    let status: BranchStatus = 'stale';
    if (daysSinceLastCommit <= 7) {
      status = 'active';
    } else if (isAbandoned) {
      status = 'abandoned';
    }

    return {
      name: branch.name,
      status,
      firstCommitDate,
      lastCommitDate: branch.lastCommitDate,
      daysToMerge,
      daysSinceLastCommit,
      authorEmail: branch.lastCommitAuthor,
      isAbandoned,
    };
  });
}

/**
 * Returns branches that have been inactive beyond the threshold.
 * Pure function.
 */
export function detectStaleBranches(
  branches: BranchInfo[],
  options: { thresholdDays?: number; now?: number } = {}
): StaleBranch[] {
  const { thresholdDays = 90, now = Date.now() } = options;


  return branches
    .map((branch) => {
      const daysSinceLastCommit = Math.floor((now - new Date(branch.lastCommitDate).getTime()) / 86_400_000);
      return {
        name: branch.name,
        authorEmail: branch.lastCommitAuthor,
        lastCommitDate: branch.lastCommitDate,
        daysSinceLastCommit,
        isRemote: branch.isRemote,
      };
    })
    .filter((b) => b.daysSinceLastCommit > thresholdDays)
    .sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);
}

/**
 * Analyzes merge frequency and patterns.
 * Pure function.
 */
export function computeMergeFrequency(
  commits: GitCommit[],
  options: { defaultBranch?: string } = {}
): MergeFrequency[] {
  const { defaultBranch = 'main' } = options;

  // Scan commits for merge commits
  const mergeCommits = commits.filter((c) => {
    const msg = c?.message || '';
    return msg.startsWith('Merge branch') || msg.startsWith('Merge pull request');
  });

  const mergesByBranch: Record<string, string[]> = {};

  mergeCommits.forEach((c) => {
    let branchName = '';
    const msg = c.message;

    // Pattern 1: "Merge branch '(.+?)'"
    const match1 = msg.match(/Merge branch '(.+?)'/);
    if (match1 && match1[1]) {
      branchName = match1[1];
    } else {
      // Pattern 2: "Merge pull request #\d+ from .+?/(.+)"
      const match2 = msg.match(/Merge pull request #\d+ from .+?\/(.+)/);
      if (match2 && match2[1]) {
        branchName = match2[1];
      }
    }

    if (branchName) {
      if (!mergesByBranch[branchName]) {
        mergesByBranch[branchName] = [];
      }
      const dates = mergesByBranch[branchName];
      if (c && c.date && dates) {
        dates.push(c.date);
      }
    }
  });

  return Object.entries(mergesByBranch)
    .map(([name, dates]) => {
      if (!dates || dates.length === 0) {
        return { name, mergeCount: 0, avgDaysBetweenMerges: null, idleRatio: 0 };
      }
      const sortedDates = ([...dates] as string[]).sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
      const d0 = sortedDates[0];
      if (!d0) return { name, mergeCount: 0, avgDaysBetweenMerges: null, idleRatio: 0 };

      const mergeCount = sortedDates.length;

      let avgDaysBetweenMerges: number | null = null;
      if (mergeCount >= 2) {
        let totalDiff = 0;
        for (let i = 1; i < sortedDates.length; i++) {
          const d1 = sortedDates[i - 1];
          const d2 = sortedDates[i];
          if (d1 && d2) {
            totalDiff += new Date(d2).getTime() - new Date(d1).getTime();
          }
        }
        avgDaysBetweenMerges = (totalDiff / (mergeCount - 1)) / 86_400_000;
      }

      // Ratio of time branch is "idle" vs active. 
      // If branch commits unknown, use 0.
      // Since we don't know total commits on branch easily without more info,
      // using the provided heuristic from the brief: 1 - (mergeCount / totalCommitsOnBranch).
      // But we don't have totalCommitsOnBranch.
      // Re-reading brief: "If branch commits unknown, use 0."
      const idleRatio = 0; 

      return {
        name,
        mergeCount,
        avgDaysBetweenMerges,
        idleRatio,
      };
    })
    .sort((a, b) => b.mergeCount - a.mergeCount);
}
