import { describe, it, expect } from 'vitest';
import { GitCommit } from '../../src/types/signal.js';
import { AnalysisBaseline } from '../../src/types/infrastructure.js';
import { createIncrementalContext, mergeBaselines } from '../../src/infrastructure/incremental.js';

const makeCommit = (hash: string, daysAgo: number, overrides: Partial<GitCommit> = {}): GitCommit => {
  const date = new Date('2024-03-24T00:00:00Z');
  date.setDate(date.getDate() - daysAgo);
  return {
    hash,
    message: 'feat: example',
    author: { name: 'Alice', email: 'alice@example.com' },
    date: date.toISOString(),
    parents: ['parent'],
    files: ['src/index.ts'],
    ...overrides,
  } as any;
};

describe('incremental', () => {
  describe('createIncrementalContext', () => {
    it('hasNewData=true when newCommits non-empty after filtering', () => {
      const newCommits = [makeCommit('h1', 0)];
      const context = createIncrementalContext(newCommits, { since: 'h0' });
      expect(context.hasNewData).toBe(true);
      expect(context.newCommits).toHaveLength(1);
    });

    it('hasNewData=false when all newCommits filtered out', () => {
      // 'bot@' emails are filtered out by default (type: 'bot')
      const newCommits = [makeCommit('h1', 0, { author: { name: 'Bot', email: 'bot@example.com' } })];
      const context = createIncrementalContext(newCommits, { since: 'h0' });
      expect(context.hasNewData).toBe(false);
      expect(context.newCommits).toHaveLength(0);
    });

    it('mergedCommits deduplicates by hash and favours new commits', () => {
      const c1 = makeCommit('h1', 0, { message: 'new' });
      const c1Old = makeCommit('h1', 1, { message: 'old' });
      const baseline: AnalysisBaseline = {
        headCommitHash: 'h1',
        headCommitDate: c1Old.date,
        commits: [c1Old],
        computedAt: 'c',
        windowDays: 30
      };
      
      const context = createIncrementalContext([c1], { since: 'h0', baseline });
      expect(context.mergedCommits).toHaveLength(1);
      expect(context.mergedCommits[0].message).toBe('new');
    });

    it('mergedCommits caps to windowDays from most recent commit', () => {
      const c1 = makeCommit('h1', 0); // Today
      const c2 = makeCommit('h2', 10); // 10 days ago
      const c3 = makeCommit('h3', 40); // 40 days ago
      
      const context = createIncrementalContext([c1, c2, c3], { since: 'x', windowDays: 30 });
      expect(context.mergedCommits).toHaveLength(2);
      expect(context.mergedCommits.map(c => c.hash)).toEqual(['h1', 'h2']);
    });

    it('updatedBaseline has correct head information', () => {
      const c1 = makeCommit('h1', 0);
      const c2 = makeCommit('h2', 5);
      const context = createIncrementalContext([c1, c2], { since: 'x' });
      
      expect(context.updatedBaseline.headCommitHash).toBe('h1');
      expect(context.updatedBaseline.headCommitDate).toBe(c1.date);
      expect(context.updatedBaseline.windowDays).toBe(30);
    });
  });

  describe('mergeBaselines', () => {
    it('combines and deduplicates commits', () => {
      const c1 = makeCommit('h1', 0);
      const c2 = makeCommit('h2', 5);
      const b1: AnalysisBaseline = { headCommitHash: 'h1', headCommitDate: 'd', commits: [c1], computedAt: 'c', windowDays: 30 };
      const b2: AnalysisBaseline = { headCommitHash: 'h2', headCommitDate: 'd', commits: [c2], computedAt: 'c', windowDays: 30 };
      
      const merged = mergeBaselines(b1, b2, 30);
      expect(merged.commits).toHaveLength(2);
      expect(merged.headCommitHash).toBe('h1');
    });

    it('caps to windowDays', () => {
      const c1 = makeCommit('h1', 0);
      const c2 = makeCommit('h2', 40);
      const b1: AnalysisBaseline = { headCommitHash: 'h1', headCommitDate: 'd', commits: [c1], computedAt: 'c', windowDays: 30 };
      const b2: AnalysisBaseline = { headCommitHash: 'h2', headCommitDate: 'd', commits: [c2], computedAt: 'c', windowDays: 30 };
      
      const merged = mergeBaselines(b1, b2, 30);
      expect(merged.commits).toHaveLength(1);
    });
  });
});
