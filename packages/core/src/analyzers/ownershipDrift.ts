import type { GitCommit } from '../types/signal.js';
import type { 
  OwnershipTransition, 
  OwnershipPeriod, 
  OrphanedFile, 
  OwnershipConcentration, 
  OwnershipDriftReport 
} from '../types/insights.js';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Computes ownership transitions for each file.
 */
export function computeOwnershipTransitions(commits: GitCommit[]): OwnershipTransition[] {
  const fileCommits: Record<string, GitCommit[]> = {};

  commits.forEach((c) => {
    c.files.forEach((f) => {
      if (!fileCommits[f]) fileCommits[f] = [];
      fileCommits[f].push(c);
    });
  });

  return Object.entries(fileCommits)
    .map(([filePath, commitsForFile]) => {
      const sortedCommits = [...commitsForFile].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const periods: OwnershipPeriod[] = [];

      if (sortedCommits.length > 0) {
        if (sortedCommits.length < 10) {
          // Single period if fewer than 10 commits
          const authorTally: Record<string, { count: number; name: string }> = {};
          sortedCommits.forEach((c) => {
            let tally = authorTally[c.author.email];
            if (!tally) {
              tally = { count: 0, name: c.author.name };
              authorTally[c.author.email] = tally;
            }
            tally.count++;
          });

          const dominant = Object.entries(authorTally).reduce(
            (a, b) => (b[1].count > a[1].count ? b : a),
            ['', { count: -1, name: '' }] as [string, { count: number; name: string }]
          );
          periods.push({
            ownerEmail: dominant[0],
            ownerName: dominant[1].name,
            from: sortedCommits[0]?.date || '',
            to: sortedCommits[sortedCommits.length - 1]?.date || '',
            commitCount: dominant[1].count,
            ownershipShare: round4(dominant[1].count / sortedCommits.length),
          });
        } else {
          // Sliding window approach for 10+ commits
          let currentPeriodCommits: GitCommit[] = [];
          
          for (let i = 0; i < sortedCommits.length; i++) {
            currentPeriodCommits.push(sortedCommits[i]!);

            if (i >= 9) {
              const window = sortedCommits.slice(Math.max(0, i - 9), i + 1);
              const windowAuthors: Record<string, number> = {};
              window.forEach((wc) => {
                windowAuthors[wc.author.email] = (windowAuthors[wc.author.email] || 0) + 1;
              });

              const dominantAuthorInWindow = Object.entries(windowAuthors).find(([, count]) => count > 5);
              
              if (dominantAuthorInWindow && periods.length > 0 && periods[periods.length - 1]!.ownerEmail !== dominantAuthorInWindow[0]) {
                // End current period and start new one
                const prevPeriod = periods[periods.length - 1]!;
                // This is a simplified split. The actual logic for "Start a new period" 
                // when author > 50% in last 10 is tricky to do purely sequentially.
                // We'll use the last 10 as the trigger.
              }
            }
          }
          
          // Fallback: If sliding window is too complex for first pass, 
          // let's stick to the simplest interpretation of the brief.
          // "Start a new period when a different author accounts for > 50% of commits 
          // in the most recent 10-commit window for that file."
          
          const finalPeriods: OwnershipPeriod[] = [];
          let currentStartIdx = 0;
          let currentOwnerEmail = '';

          // Find first owner from first 10 (or all if < 10)
          const firstWindow = sortedCommits.slice(0, 10);
          const firstTally: Record<string, {count: number, name: string}> = {};
          firstWindow.forEach(c => {
            if (c) {
              let tally = firstTally[c.author.email];
              if (!tally) {
                tally = {count: 0, name: c.author.name};
                firstTally[c.author.email] = tally;
              }
              tally.count++;
            }
          });
          currentOwnerEmail = Object.entries(firstTally).reduce(
            (a, b) => b[1].count > a[1].count ? b : a,
            ['', { count: -1, name: '' }] as [string, { count: number; name: string }]
          )[0];

          for (let i = 1; i < sortedCommits.length; i++) {
            const window = sortedCommits.slice(Math.max(0, i - 9), i + 1);
            const windowTally: Record<string, number> = {};
            window.forEach(c => {
              windowTally[c.author.email] = (windowTally[c.author.email] || 0) + 1;
            });

            const dominant = Object.entries(windowTally).find(([, count]) => count > 5);
            if (dominant && dominant[0] !== currentOwnerEmail) {
              // Transition!
              const periodCommits = sortedCommits.slice(currentStartIdx, i);
              const ownerCommits = periodCommits.filter(c => c.author.email === currentOwnerEmail);
              const ownerName = sortedCommits[currentStartIdx]?.author.name || '';
              
              finalPeriods.push({
                ownerEmail: currentOwnerEmail,
                ownerName,
                from: sortedCommits[currentStartIdx]?.date || '',
                to: sortedCommits[i-1]?.date || '',
                commitCount: ownerCommits.length,
                ownershipShare: round4(ownerCommits.length / Math.max(periodCommits.length, 1)),
              });

              currentStartIdx = i;
              currentOwnerEmail = dominant[0];
            }
          }

          // Final period
          const lastPeriodCommits = sortedCommits.slice(currentStartIdx);
          const lastOwnerCommits = lastPeriodCommits.filter(c => c.author.email === currentOwnerEmail);
          const lastOwnerName = sortedCommits[currentStartIdx]?.author.name || '';
          finalPeriods.push({
            ownerEmail: currentOwnerEmail,
            ownerName: lastOwnerName,
            from: sortedCommits[currentStartIdx]?.date || '',
            to: sortedCommits[sortedCommits.length - 1]?.date || '',
            commitCount: lastOwnerCommits.length,
            ownershipShare: round4(lastOwnerCommits.length / Math.max(lastPeriodCommits.length, 1)),
          });
          
          periods.push(...finalPeriods);
        }
      }

      const ownerEmails = periods.map(p => p.ownerEmail);
      const ownerCount = new Set(ownerEmails).size;
      let hasTransitioned = false;
      if (periods.length > 1) {
        for (let i = 1; i < periods.length; i++) {
          if (periods[i]!.ownerEmail !== periods[i-1]!.ownerEmail) {
            hasTransitioned = true;
            break;
          }
        }
      }

      return {
        filePath,
        periods,
        hasTransitioned,
        ownerCount,
      };
    })
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

/**
 * Detects orphaned files whose primary author is no longer active.
 */
export function detectOrphanedFiles(
  commits: GitCommit[], 
  knownActiveEmails: string[], 
  options: { inactivityThresholdDays?: number } = {}
): OrphanedFile[] {
  const { inactivityThresholdDays = 180 } = options;
  const fileCommits: Record<string, GitCommit[]> = {};
  
  let minDate = Infinity;
  let maxDate = -Infinity;

  commits.forEach((c) => {
    const t = new Date(c.date).getTime();
    if (t < minDate) minDate = t;
    if (t > maxDate) maxDate = t;
    
    c.files.forEach((f) => {
      let commitsList = fileCommits[f];
      if (!commitsList) {
        commitsList = [];
        fileCommits[f] = commitsList;
      }
      commitsList.push(c);
    });
  });

  const range = maxDate - minDate;
  const earlyThreshold = minDate + range * 0.2;
  const now = Date.now();

  return Object.entries(fileCommits)
    .map(([filePath, commitsForFile]) => {
      const sorted = [...commitsForFile].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Original primary author: most commits in earliest 20%
      const earlyCommits = sorted.filter(c => new Date(c.date).getTime() <= earlyThreshold);
      // If no commits in early 20%, use the very first author
      const pool = earlyCommits.length > 0 ? earlyCommits : [sorted[0]!];
      
      const tally: Record<string, number> = {};
      pool.forEach(c => {
        tally[c.author.email] = (tally[c.author.email] || 0) + 1;
      });
      const originalOwnerEmail = Object.entries(tally).reduce((a, b) => b[1] > a[1] ? b : a)[0];
      
      const ownerCommits = sorted.filter(c => c.author.email === originalOwnerEmail);
      const lastOwnerCommit = ownerCommits[ownerCommits.length - 1]!;
      const daysSinceOwnerActivity = Math.floor((now - new Date(lastOwnerCommit.date).getTime()) / 86_400_000);
      
      let lastOwnerIdx = -1;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.author.email === originalOwnerEmail) {
          lastOwnerIdx = i;
          break;
        }
      }
      const hasNoSuccessor = lastOwnerIdx === sorted.length - 1;

      return {
        filePath,
        originalOwnerEmail,
        lastKnownActivityDate: lastOwnerCommit.date,
        daysSinceOwnerActivity,
        hasNoSuccessor,
      };
    })
    .filter(f => !knownActiveEmails.includes(f.originalOwnerEmail) && f.daysSinceOwnerActivity > inactivityThresholdDays)
    .sort((a, b) => b.daysSinceOwnerActivity - a.daysSinceOwnerActivity);
}

/**
 * Computes ownership concentration using the Gini coefficient.
 */
export function computeOwnershipConcentration(commits: GitCommit[]): OwnershipConcentration {
  const authorTally: Record<string, number> = {};
  let totalFileCommits = 0;

  commits.forEach((c) => {
    c.files.forEach(() => {
      authorTally[c.author.email] = (authorTally[c.author.email] || 0) + 1;
      totalFileCommits++;
    });
  });

  const counts = Object.values(authorTally).sort((a, b) => a - b);
  const n = counts.length;
  
  if (n <= 1) {
    const dominantOwnerEmail = n === 1 ? Object.keys(authorTally)[0]! : null;
    return {
      giniCoefficient: 0,
      rating: 'distributed',
      dominantOwnerEmail,
      dominantOwnerShare: n === 1 ? 1 : 0,
    };
  }

  // Gini formula: (2 * Σ(i * x_i)) / (n * Σ(x_i)) - (n + 1) / n
  let sumXi = 0;
  let weightedSum = 0;
  counts.forEach((x, idx) => {
    const i = idx + 1;
    sumXi += x;
    weightedSum += i * x;
  });

  const giniCoefficient = (2 * weightedSum) / (n * sumXi) - (n + 1) / n;
  
  let rating: 'concentrated' | 'balanced' | 'distributed' = 'distributed';
  if (giniCoefficient > 0.6) rating = 'concentrated';
  else if (giniCoefficient >= 0.3) rating = 'balanced';

  const dominant = Object.entries(authorTally).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
  const dominantOwnerEmail = dominant[0] || null;
  const dominantOwnerShare = totalFileCommits > 0 ? dominant[1] / totalFileCommits : 0;

  return {
    giniCoefficient: Math.max(0, Math.min(1, giniCoefficient)), // Clamp to 0-1
    rating,
    dominantOwnerEmail,
    dominantOwnerShare: Math.round(dominantOwnerShare * 10000) / 10000,
  };
}

/**
 * Aggregates ownership drift metrics.
 */
export function analyzeOwnershipDrift(
  commits: GitCommit[], 
  knownActiveEmails: string[], 
  options?: { inactivityThresholdDays?: number }
): OwnershipDriftReport {
  return {
    transitions: computeOwnershipTransitions(commits),
    orphanedFiles: detectOrphanedFiles(commits, knownActiveEmails, options),
    concentration: computeOwnershipConcentration(commits),
    analyzedAt: new Date().toISOString(),
  };
}
