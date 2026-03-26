import type { GitCommit } from '../types/signal.js';
import type { 
  CommitMessageScore, 
  AtomicityScore, 
  ReviewSignal, 
  CommitQualityReport,
  MessageQualityLevel,
  AtomicityLevel
} from '../types/analytics.js';

/**
 * Heuristic to detect imperative mood in the first word.
 */
function isImperative(word: string): boolean {
  if (!word) return false;
  const w = word.toLowerCase();
  
  // Custom list from the brief
  const imperativeList = [
    'add', 'fix', 'update', 'remove', 'refactor', 'improve', 'change', 'move', 
    'rename', 'delete', 'implement', 'create', 'init', 'bump', 'revert', 
    'merge', 'release', 'upgrade', 'downgrade', 'enable', 'disable', 
    'configure', 'extract'
  ];

  if (imperativeList.includes(w)) return true;

  // Simple heuristic: starts with capital AND does not end in 's'
  if (word[0] && word[0] === word[0].toUpperCase() && !word.endsWith('s')) return true;

  return false;
}

/**
 * Scores a commit message based on quality rules.
 * Pure function.
 */
export function scoreCommitMessage(commit: GitCommit): CommitMessageScore {
  let score = 100;
  const reasons: string[] = [];
  const message = commit.message || '';
  const lines = message.split('\n');
  const subject = lines[0] || '';

  // Rule: Empty
  if (!message.trim()) {
    return {
      hash: commit.hash,
      message,
      qualityLevel: 'poor',
      score: 0,
      reasons: ['Empty commit message'],
    };
  }

  // Rule: Length < 10
  if (message.length < 10) {
    score -= 40;
    reasons.push('Message too short');
  }

  // Rule: Subject > 100
  if (subject.length > 100) {
    score -= 10;
    reasons.push('Subject line too long (>100 chars)');
  }

  // Rule: Convention prefix
  // Simplified check for type: or type(scope):
  const conventionalMatch = subject.match(/^(\w+)(\(.*\))?!?: /);
  if (!conventionalMatch) {
    score -= 20;
    reasons.push('Missing conventional commit prefix');
  }

  // Rule: Ends with period
  if (subject.endsWith('.')) {
    score -= 5;
    reasons.push('Subject line should not end with period');
  }

  // Rule: Imperative mood
  let contentForImperative = subject;
  if (conventionalMatch) {
    contentForImperative = subject.slice(conventionalMatch[0].length).trim();
  }
  const firstWord = contentForImperative.split(/\s+/)[0] || '';
  if (!isImperative(firstWord)) {
    score -= 15;
    reasons.push('Subject line should use imperative mood');
  }

  // Rule: WIP
  if (subject.toUpperCase() === 'WIP' || subject.toUpperCase().startsWith('WIP ') || subject.toUpperCase().startsWith('WIP:')) {
    score -= 50;
    reasons.push('Work-in-progress commit');
  }

  // Rule: All lowercase
  if (subject === subject.toLowerCase() && !subject.includes(':')) {
    score -= 10;
    reasons.push('No capitalisation or structure');
  }

  // Bonus: Conventional + Body
  if (conventionalMatch && lines.length > 2 && lines[1] !== undefined && lines[1].trim() === '' && lines[2] !== undefined && lines[2].trim() !== '') {
    score += 10;
  }

  score = Math.max(0, score);

  let qualityLevel: MessageQualityLevel = 'poor';
  if (score >= 70) qualityLevel = 'good';
  else if (score >= 40) qualityLevel = 'acceptable';

  return {
    hash: commit.hash,
    message: commit.message,
    qualityLevel,
    score,
    reasons,
  };
}

/**
 * Detects commit atomicity based on file count and directory spread.
 * Pure function.
 */
export function detectAtomicity(commit: GitCommit): AtomicityScore {
  const fileCount = commit.files.length;
  
  const dirs = new Set<string>();
  commit.files.forEach((f) => {
    const parts = f.split('/');
    if (parts.length > 1) {
      const topDir = parts[0];
      if (topDir) dirs.add(topDir);
    } else if (f) {
      dirs.add('root');
    }
  });

  const directoriesAffected = dirs.size;
  const crossesConcernBoundary = directoriesAffected >= 3;

  let level: AtomicityLevel = 'atomic';
  if (fileCount > 30 || crossesConcernBoundary) {
    level = 'god';
  } else if (fileCount > 10) {
    level = 'large';
  }

  return {
    hash: commit.hash,
    fileCount,
    directoriesAffected,
    level,
    crossesConcernBoundary,
  };
}

/**
 * Detects review signals from commit metadata.
 * Pure function.
 */
export function computeReviewSignals(commit: GitCommit): ReviewSignal {
  const msg = commit.message;
  
  // Patterns: #42, PR-17, pull request #42
  const prMatch = msg.match(/(?:#|PR-|pull request #)(\d+)/i);
  const prNumber = prMatch && prMatch[1] ? parseInt(prMatch[1], 10) : null;

  const hasReviewKeyword = /Reviewed-by:|Approved-by:|Co-authored-by:/i.test(msg);
  const isMerge = commit.parents.length >= 2;

  // true if: not a merge AND no PR AND no review keyword
  const mergedWithoutReview = !isMerge && prNumber === null && !hasReviewKeyword;

  return {
    hash: commit.hash,
    mergedWithoutReview,
    author: commit.author ? commit.author.email : '',
    prNumber,
  };
}

/**
 * Aggregates quality metrics for a set of commits.
 * Pure function.
 */
export function analyzeCommitQuality(commits: GitCommit[]): CommitQualityReport {
  if (commits.length === 0) {
    return {
      commits: [],
      goodMessageRatio: 0,
      atomicRatio: 0,
      noReviewRatio: 0,
    };
  }

  const results = commits.map((c) => ({
    hash: c.hash,
    message: scoreCommitMessage(c),
    atomicity: detectAtomicity(c),
    review: computeReviewSignals(c),
  }));

  const goodCount = results.filter((r) => r.message.qualityLevel === 'good').length;
  const atomicCount = results.filter((r) => r.atomicity.level === 'atomic').length;
  const noReviewCount = results.filter((r) => r.review.mergedWithoutReview).length;

  const round = (val: number) => Math.round(val * 10000) / 10000;

  return {
    commits: results,
    goodMessageRatio: round(goodCount / commits.length),
    atomicRatio: round(atomicCount / commits.length),
    noReviewRatio: round(noReviewCount / commits.length),
  };
}
