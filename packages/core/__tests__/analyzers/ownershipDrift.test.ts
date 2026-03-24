import { describe, it, expect } from 'vitest';
import { 
  computeOwnershipTransitions, 
  detectOrphanedFiles, 
  computeOwnershipConcentration 
} from '../../src/analyzers/ownershipDrift.js';
import type { GitCommit } from '../../src/types/signal.js';

const makeCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  hash: 'abc1234',
  message: 'feat: add login',
  author: { name: 'Alice', email: 'alice@example.com' },
  date: '2024-01-15T00:00:00.000Z',
  parents: ['parent1'],
  files: ['src/auth/login.ts'],
  ...overrides,
});

describe('ownershipDrift analyzer', () => {
  describe('computeOwnershipTransitions', () => {
    it('single author, single period', () => {
      const commits = [
        makeCommit({ author: { name: 'Alice', email: 'alice@example.com' }, files: ['fileA.ts'] }),
      ];
      const result = computeOwnershipTransitions(commits);
      expect(result).toHaveLength(1);
      expect(result[0]!.filePath).toBe('fileA.ts');
      expect(result[0]!.periods).toHaveLength(1);
      expect(result[0]!.periods[0]!.ownerEmail).toBe('alice@example.com');
    });

    it('ownership transfers to new dominant author', () => {
      // Create 15 commits. First 10 by Alice, next 5 by Bob.
      // Then 1 by Bob that makes him dominant in a 10-commit window.
      // Wait, let's use a simpler transition trigger.
      const commits = [
        ...Array.from({ length: 10 }, (_, i) => makeCommit({ 
          hash: `a${i}`, 
          author: { name: 'Alice', email: 'alice@example.com' }, 
          date: `2024-01-0${i+1}T00:00:00.000Z`,
          files: ['fileA.ts'] 
        })),
        ...Array.from({ length: 11 }, (_, i) => makeCommit({ 
          hash: `b${i}`, 
          author: { name: 'Bob', email: 'bob@example.com' }, 
          date: `2024-01-${i+11}T00:00:00.000Z`,
          files: ['fileA.ts'] 
        })),
      ];
      const result = computeOwnershipTransitions(commits);
      expect(result[0]!.hasTransitioned).toBe(true);
      expect(result[0]!.ownerCount).toBe(2);
      expect(result[0]!.periods.length).toBeGreaterThan(1);
    });

    it('hasTransitioned=false when same owner throughout', () => {
      const commits = [
        makeCommit({ author: { name: 'Alice', email: 'alice@example.com' }, date: '2024-01-01T00:00:00Z', files: ['fileA.ts'] }),
        makeCommit({ author: { name: 'Alice', email: 'alice@example.com' }, date: '2024-01-02T00:00:00Z', files: ['fileA.ts'] }),
      ];
      const result = computeOwnershipTransitions(commits);
      expect(result[0]!.hasTransitioned).toBe(false);
    });

    it('results sorted by filePath ascending', () => {
      const commits = [
        makeCommit({ files: ['z.ts'] }),
        makeCommit({ files: ['a.ts'] }),
      ];
      const result = computeOwnershipTransitions(commits);
      expect(result[0]!.filePath).toBe('a.ts');
      expect(result[1]!.filePath).toBe('z.ts');
    });

    it('empty commits returns []', () => {
      expect(computeOwnershipTransitions([])).toEqual([]);
    });
  });

  describe('detectOrphanedFiles', () => {
    it('returns file when original owner is not in knownActiveEmails', () => {
      const commits = [
        makeCommit({ 
          author: { name: 'Old Timer', email: 'old@example.com' }, 
          date: '2023-01-01T00:00:00.000Z',
          files: ['legacy.ts'] 
        }),
      ];
      // Fixed Date.now() for deterministic testing would be better, but we'll use a large threshold
      const result = detectOrphanedFiles(commits, ['active@example.com'], { inactivityThresholdDays: 0 });
      expect(result).toHaveLength(1);
      expect(result[0]!.originalOwnerEmail).toBe('old@example.com');
    });

    it('excludes file when original owner IS in knownActiveEmails', () => {
      const commits = [
        makeCommit({ 
          author: { name: 'Alice', email: 'alice@example.com' }, 
          date: '2023-01-01T00:00:00.000Z',
          files: ['legacy.ts'] 
        }),
      ];
      const result = detectOrphanedFiles(commits, ['alice@example.com'], { inactivityThresholdDays: 0 });
      expect(result).toHaveLength(0);
    });

    it('hasNoSuccessor=true when no other author committed after owner', () => {
      const commits = [
        makeCommit({ author: { name: 'Old Timer', email: 'old@example.com' }, date: '2023-01-01T00:00:00Z', files: ['a.ts'] }),
      ];
      const result = detectOrphanedFiles(commits, [], { inactivityThresholdDays: 0 });
      expect(result[0]!.hasNoSuccessor).toBe(true);
    });

    it('hasNoSuccessor=false when another author committed after owner', () => {
      const commits = [
        makeCommit({ author: { name: 'Old Timer', email: 'old@example.com' }, date: '2023-01-01T00:00:00Z', files: ['a.ts'] }),
        makeCommit({ author: { name: 'Active User', email: 'active@example.com' }, date: '2024-01-01T00:00:00Z', files: ['a.ts'] }),
      ];
      const result = detectOrphanedFiles(commits, [], { inactivityThresholdDays: 0 });
      expect(result[0]!.hasNoSuccessor).toBe(false);
    });
  });

  describe('computeOwnershipConcentration', () => {
    it('single author → gini=0, rating="distributed"', () => {
      const commits = [makeCommit({ files: ['a.ts', 'b.ts'] })];
      const result = computeOwnershipConcentration(commits);
      expect(result.giniCoefficient).toBe(0);
      expect(result.rating).toBe('distributed');
    });

    it('one author owns everything → gini near 1 (0 with n=1, so we need 2+ authors)', () => {
      const commits = [
        ...Array.from({ length: 100 }, () => makeCommit({ author: { name: 'Big Fish', email: 'big@example.com' }, files: ['a.ts'] })),
        ...Array.from({ length: 9 }, (_, i) => makeCommit({ author: { name: `Small Fish ${i}`, email: `small${i}@example.com` }, files: ['b.ts'] })),
      ];
      const result = computeOwnershipConcentration(commits);
      expect(result.giniCoefficient).toBeGreaterThan(0.8);
      expect(result.rating).toBe('concentrated');
    });

    it('dominantOwnerEmail is the highest commit-count author', () => {
      const commits = [
        makeCommit({ author: { name: 'Author A', email: 'a@ex.com' }, files: ['a.ts', 'b.ts'] }),
        makeCommit({ author: { name: 'Author B', email: 'b@ex.com' }, files: ['c.ts'] }),
      ];
      const result = computeOwnershipConcentration(commits);
      expect(result.dominantOwnerEmail).toBe('a@ex.com');
      expect(result.dominantOwnerShare).toBe(round4(2/3));
    });
  });
});

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
