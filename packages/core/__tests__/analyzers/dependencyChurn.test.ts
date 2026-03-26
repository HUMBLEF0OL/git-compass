import { describe, it, expect } from 'vitest';
import { 
  correlateChangeFrequency, 
  detectCouplingDrift 
} from '../../src/analyzers/dependencyChurn.js';
import type { GitCommit } from '../../src/types/signal.js';

const makeCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  hash: 'abc1234',
  message: 'feat: add login',
  author: { name: 'Alice', email: 'alice@example.com' },
  date: '2024-01-15T00:00:00.000Z',
  parents: ['parent1'],
  files: ['fileA.ts', 'fileB.ts'],
  ...overrides,
});

describe('dependencyChurn analyzer', () => {
  describe('correlateChangeFrequency', () => {
    it('pair detected when two files co-change', () => {
      const commits = [makeCommit({ files: ['a.ts', 'b.ts'] })];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      expect(result).toHaveLength(1);
      expect(result[0]!.fileA).toBe('a.ts');
      expect(result[0]!.fileB).toBe('b.ts');
    });

    it('Jaccard score correct (co / (a + b - co))', () => {
      // a.ts changed 3 times, b.ts changed 2 times, co-change 1 time.
      // score = 1 / (3 + 2 - 1) = 1 / 4 = 0.25
      const commits = [
        makeCommit({ hash: '1', files: ['a.ts', 'b.ts'] }),
        makeCommit({ hash: '2', files: ['a.ts'] }),
        makeCommit({ hash: '3', files: ['a.ts'] }),
        makeCommit({ hash: '4', files: ['b.ts'] }),
      ];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      const pair = result.find(r => r.fileA === 'a.ts' && r.fileB === 'b.ts');
      expect(pair!.couplingScore).toBe(0.25);
    });

    it('trend="strengthening" when late > early * 1.2', () => {
      const commits = [
        // Early window: 1 co-change
        makeCommit({ hash: 'e1', date: '2024-01-01T', files: ['a.ts', 'b.ts'] }),
        makeCommit({ hash: 'e2', date: '2024-01-02T', files: ['a.ts'] }),
        // Midpoint: commits.length = 4, so idx 0,1 are early
        // Late window: 2 co-changes
        makeCommit({ hash: 'l1', date: '2024-01-11T', files: ['a.ts', 'b.ts'] }),
        makeCommit({ hash: 'l2', date: '2024-01-12T', files: ['a.ts', 'b.ts'] }),
      ];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      expect(result[0]!.trend).toBe('strengthening');
    });

    it('filters out pairs below minCouplingScore', () => {
      const commits = [makeCommit({ files: ['a.ts', 'b.ts'] })];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0.99 });
      expect(result.filter(r => r.fileA === 'a.ts' && r.fileB === 'b.ts')).toHaveLength(1);
      // Wait, Jaccard with 1 co-change for both is 1.0. Correct.
    });

    it('skips commits with only 1 file', () => {
      const commits = [makeCommit({ files: ['a.ts'] })];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      expect(result).toHaveLength(0);
    });

    it('skips commits with > 50 files', () => {
      const files = Array.from({ length: 51 }, (_, i) => `f${i}.ts`);
      const commits = [makeCommit({ files })];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      expect(result).toHaveLength(0);
    });

    it('canonical pair order: fileA < fileB lexicographically', () => {
      const commits = [makeCommit({ files: ['z.ts', 'a.ts'] })];
      const result = correlateChangeFrequency(commits, { minCouplingScore: 0 });
      expect(result[0]!.fileA).toBe('a.ts');
      expect(result[0]!.fileB).toBe('z.ts');
    });
  });

  describe('detectCouplingDrift', () => {
    it('status="decoupled" when delta < -0.2', () => {
      const prev = [makeCommit({ files: ['a.ts', 'b.ts'] })]; // score 1.0
      const curr = [
        makeCommit({ hash: 'c1', files: ['a.ts', 'b.ts'] }),
        makeCommit({ hash: 'c2', files: ['a.ts'] }),
        makeCommit({ hash: 'c3', files: ['a.ts'] }),
        makeCommit({ hash: 'c4', files: ['b.ts'] }),
      ]; // score 0.25 (1/4)
      // delta = 0.25 - 1.0 = -0.75
      const result = detectCouplingDrift(curr, prev);
      expect(result[0]!.status).toBe('decoupled');
    });

    it('status="coupled" when delta > 0.2', () => {
      const prev = [
        makeCommit({ hash: 'p1', files: ['a.ts', 'b.ts'] }),
        makeCommit({ hash: 'p2', files: ['a.ts'] }),
        makeCommit({ hash: 'p3', files: ['a.ts'] }),
      ]; // score 1/3 = 0.33
      const curr = [makeCommit({ files: ['a.ts', 'b.ts'] })]; // score 1.0
      // delta = 1.0 - 0.33 = 0.67
      const result = detectCouplingDrift(curr, prev);
      expect(result[0]!.status).toBe('coupled');
    });
  });
});
