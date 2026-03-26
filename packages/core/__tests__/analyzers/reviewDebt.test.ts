import { describe, it, expect } from 'vitest';
import { 
  computeReviewCoverage, 
  computeReviewConcentration 
} from '../../src/analyzers/reviewDebt.js';
import type { GitCommit } from '../../src/types/signal.js';

const makeCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  hash: 'abc1234',
  message: 'feat: add login',
  author: { name: 'Alice', email: 'alice@example.com' },
  date: '2024-01-15T00:00:00.000Z',
  parents: ['parent1'],
  files: ['fileA.ts'],
  ...overrides,
});

describe('reviewDebt analyzer', () => {
  describe('computeReviewCoverage', () => {
    it('commit with Reviewed-by: counts as reviewed', () => {
      const commits = [makeCommit({ message: 'feat: x\n\nReviewed-by: Bob <bob@ex.com>' })];
      const result = computeReviewCoverage(commits);
      expect(result.reviewedCommits).toBe(1);
      expect(result.coverageRatio).toBe(1);
    });

    it('commit with PR reference (#42) counts as reviewed', () => {
      const commits = [makeCommit({ message: 'feat: x (#42)' })];
      const result = computeReviewCoverage(commits);
      expect(result.reviewedCommits).toBe(1);
    });

    it('merge commit counts as reviewed', () => {
      const commits = [makeCommit({ parents: ['p1', 'p2'] })];
      const result = computeReviewCoverage(commits);
      expect(result.reviewedCommits).toBe(1);
    });

    it('commit with none of the above is direct push', () => {
      const commits = [makeCommit({ message: 'oops', parents: ['p1'] })];
      const result = computeReviewCoverage(commits);
      expect(result.directPushCommits).toBe(1);
      expect(result.reviewedCommits).toBe(0);
    });
  });

  describe('computeReviewConcentration', () => {
    it('extracts reviewer from Reviewed-by: header', () => {
      const commits = [makeCommit({ message: 'feat: x\n\nReviewed-by: Bob <bob@ex.com>' })];
      const result = computeReviewConcentration(commits);
      expect(result.reviewers).toHaveLength(1);
      expect(result.reviewers[0]!.reviewerEmail).toBe('bob@ex.com');
    });

    it('isBottlenecked=true when top reviewer > 50%', () => {
      const commits = [
        makeCommit({ message: 'x\n\nReviewed-by: A <a@ex.com>' }),
        makeCommit({ message: 'y\n\nReviewed-by: A <a@ex.com>' }),
        makeCommit({ message: 'z\n\nReviewed-by: B <b@ex.com>' }),
      ];
      // A has 2/3 = 0.66
      const result = computeReviewConcentration(commits);
      expect(result.isBottlenecked).toBe(true);
      expect(result.topReviewerEmail).toBe('a@ex.com');
    });
  });
});
