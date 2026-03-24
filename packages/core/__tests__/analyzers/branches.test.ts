import { describe, it, expect } from 'vitest';
// @ts-ignore
import { 
  analyzeBranchLifecycles, 
  detectStaleBranches, 
  computeMergeFrequency 
} from '../../src/analyzers/branches.js';
// @ts-ignore
import type { GitCommit } from '../../src/types/signal.js';
// @ts-ignore
import type { BranchInfo } from '../../src/types/analytics.js';

const makeCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  hash: 'abc1234',
  message: 'feat: add login',
  author: { name: 'Alice', email: 'alice@example.com' },
  date: new Date().toISOString(),
  parents: ['parent1'],
  files: ['src/auth/login.ts'],
  ...overrides,
});

describe('analyzeBranchLifecycles', () => {
  it('status="active" when daysSinceLastCommit <= 7', () => {
    const now = new Date();
    const branch: BranchInfo = {
      name: 'feat/auth',
      isRemote: false,
      lastCommitHash: 'h1',
      lastCommitDate: now.toISOString(),
      lastCommitAuthor: 'alice@example.com',
    };
    const results = analyzeBranchLifecycles([branch], []);
    expect(results[0].status).toBe('active');
  });

  it('status="stale" when 7 < days <= 90', () => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    const branch: BranchInfo = {
      name: 'feat/old',
      isRemote: false,
      lastCommitHash: 'h1',
      lastCommitDate: date.toISOString(),
      lastCommitAuthor: 'alice@example.com',
    };
    const results = analyzeBranchLifecycles([branch], []);
    expect(results[0].status).toBe('stale');
  });

  it('status="abandoned" when days > 90 and no merge found', () => {
    const date = new Date();
    date.setDate(date.getDate() - 100);
    const branch: BranchInfo = {
      name: 'feat/dead',
      isRemote: false,
      lastCommitHash: 'h1',
      lastCommitDate: date.toISOString(),
      lastCommitAuthor: 'alice@example.com',
    };
    const results = analyzeBranchLifecycles([branch], []);
    expect(results[0].status).toBe('abandoned');
    expect(results[0].isAbandoned).toBe(true);
  });

  it('daysToMerge is non-null when merge commit found in history', () => {
    const firstDate = '2024-03-01T10:00:00Z';
    const mergeDate = '2024-03-05T10:00:00Z';
    const branch: BranchInfo = {
      name: 'feat/merged',
      isRemote: false,
      lastCommitHash: 'h1',
      lastCommitDate: '2024-03-04T10:00:00Z',
      lastCommitAuthor: 'alice@example.com',
    };
    const commits = [
      makeCommit({ date: firstDate, author: { name: 'Alice', email: 'alice@example.com' } }),
      makeCommit({ hash: 'm1', message: "Merge branch 'feat/merged'", date: mergeDate }),
    ];
    const results = analyzeBranchLifecycles([branch], commits);
    expect(results[0].daysToMerge).toBe(4);
  });

  it('isAbandoned=false for merged branch even if old', () => {
    const date = new Date();
    date.setDate(date.getDate() - 100);
    const branch: BranchInfo = {
      name: 'feat/merged-old',
      isRemote: false,
      lastCommitHash: 'h1',
      lastCommitDate: date.toISOString(),
      lastCommitAuthor: 'alice@example.com',
    };
    const commits = [
      makeCommit({ message: "Merge branch 'feat/merged-old'", date: new Date().toISOString() }),
    ];
    const results = analyzeBranchLifecycles([branch], commits);
    expect(results[0].isAbandoned).toBe(false);
  });
});

describe('detectStaleBranches', () => {
  it('returns only branches beyond threshold', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const newDate = new Date();
    
    const branches: BranchInfo[] = [
      { name: 'old', isRemote: false, lastCommitHash: 'h1', lastCommitDate: oldDate.toISOString(), lastCommitAuthor: 'a1' },
      { name: 'new', isRemote: false, lastCommitHash: 'h2', lastCommitDate: newDate.toISOString(), lastCommitAuthor: 'a2' },
    ];
    const stale = detectStaleBranches(branches, { thresholdDays: 90 });
    expect(stale).toHaveLength(1);
    expect(stale[0].name).toBe('old');
  });
});

describe('computeMergeFrequency', () => {
  it('detects "Merge branch" and "Merge pull request" patterns', () => {
    const commits = [
      makeCommit({ message: "Merge branch 'feat/alpha'", date: '2024-03-01T10:00:00Z' }),
      makeCommit({ message: "Merge pull request #1 from org/feat/beta", date: '2024-03-02T10:00:00Z' }),
    ];
    const results = computeMergeFrequency(commits);
    expect(results).toHaveLength(2);
    expect(results.find((b: any) => b.name === 'feat/alpha')).toBeDefined();
    expect(results.find((b: any) => b.name === 'feat/beta')).toBeDefined();
  });
});
