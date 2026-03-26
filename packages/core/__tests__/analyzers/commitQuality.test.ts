import { describe, it, expect } from 'vitest';
// @ts-ignore
import { 
  scoreCommitMessage, 
  detectAtomicity, 
  computeReviewSignals, 
  analyzeCommitQuality 
} from '../../src/analyzers/commitQuality.js';
// @ts-ignore
import type { GitCommit } from '../../src/types/signal.js';

const makeCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  hash: 'abc1234',
  message: 'feat: add login',
  author: { name: 'Alice', email: 'alice@example.com' },
  date: new Date().toISOString(),
  parents: ['parent1'],
  files: ['src/auth/login.ts'],
  ...overrides,
});

describe('scoreCommitMessage', () => {
  it('empty message scores 0, level="poor"', () => {
    const score = scoreCommitMessage(makeCommit({ message: '' }));
    expect(score.score).toBe(0);
    expect(score.qualityLevel).toBe('poor');
  });

  it('perfect conventional commit with body scores high', () => {
    const score = scoreCommitMessage(makeCommit({ 
      message: 'feat: implement authentication study\n\nThis adds the core auth logic.' 
    }));
    expect(score.score).toBeGreaterThanOrEqual(70);
    expect(score.qualityLevel).toBe('good');
  });

  it('WIP commit deducts -50', () => {
    const score = scoreCommitMessage(makeCommit({ message: 'WIP: save progress' }));
    expect(score.reasons).toContain('Work-in-progress commit');
  });
});

describe('detectAtomicity', () => {
  it('1 file, 1 dir -> level="atomic"', () => {
    const score = detectAtomicity(makeCommit({ files: ['src/main.ts'] }));
    expect(score.level).toBe('atomic');
    expect(score.directoriesAffected).toBe(1);
  });

  it('3+ top-level dirs -> crossesConcernBoundary=true, level="god"', () => {
    const score = detectAtomicity(makeCommit({ 
      files: ['src/main.ts', 'lib/util.ts', 'assets/logo.png'] 
    }));
    expect(score.crossesConcernBoundary).toBe(true);
    expect(score.level).toBe('god');
  });
});

describe('computeReviewSignals', () => {
  it('message with #42 -> prNumber=42', () => {
    const signal = computeReviewSignals(makeCommit({ message: 'feat: login (#42)' }));
    expect(signal.prNumber).toBe(42);
  });

  it('single parent, no PR, no review keyword -> mergedWithoutReview=true', () => {
    const signal = computeReviewSignals(makeCommit({ parents: ['p1'] }));
    expect(signal.mergedWithoutReview).toBe(true);
  });
});
