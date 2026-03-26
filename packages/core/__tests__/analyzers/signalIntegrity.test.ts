import { describe, it, expect } from 'vitest';
import { computeSignalIntegrity } from '../../src/analyzers/signalIntegrity.js';
import { GitCommit } from '../../src/types/signal.js';

describe('signalIntegrity', () => {
  const commit1: GitCommit = {
    hash: '1',
    message: 'feat: valid',
    author: { name: 'User', email: 'user@example.com' },
    date: '2023-01-01',
    parents: ['0'],
    files: ['src/main.ts'],
  };

  const botCommit: GitCommit = {
    hash: '2',
    message: 'chore: update',
    author: { name: 'dependabot[bot]', email: 'bot@example.com' },
    date: '2023-01-01',
    parents: ['1'],
    files: ['package-lock.json'],
  };

  const mergeCommit: GitCommit = {
    hash: '3',
    message: 'Merge branch main',
    author: { name: 'User', email: 'user@example.com' },
    date: '2023-01-01',
    parents: ['1', '2'],
    files: ['src/main.ts'],
  };

  it('computeSignalIntegrity — noiseRatio = 0 when nothing filtered', () => {
    const raw = [commit1];
    const filtered = [commit1];
    const report = computeSignalIntegrity(raw, filtered);
    expect(report.noiseRatio).toBe(0);
    expect(report.filteredOut).toBe(0);
    expect(report.affectedAnalyzers).toHaveLength(0);
  });

  it('computeSignalIntegrity — noiseRatio = 1 when everything filtered', () => {
    const raw = [botCommit];
    const filtered: GitCommit[] = [];
    const report = computeSignalIntegrity(raw, filtered);
    expect(report.noiseRatio).toBe(1);
    expect(report.filteredOut).toBe(1);
  });

  it('computeSignalIntegrity — correct filteredOut count', () => {
    const raw = [commit1, botCommit, mergeCommit];
    const filtered = [commit1];
    const report = computeSignalIntegrity(raw, filtered);
    expect(report.filteredOut).toBe(2);
  });

  it('computeSignalIntegrity — topNoiseSources sorted descending by count', () => {
    const raw = [commit1, botCommit, botCommit, mergeCommit];
    const filtered = [commit1];
    const report = computeSignalIntegrity(raw, filtered);
    expect(report.topNoiseSources[0].reason).toBe('bot_author');
    expect(report.topNoiseSources[0].count).toBe(2);
    expect(report.topNoiseSources[1].reason).toBe('merge_commit');
    expect(report.topNoiseSources[1].count).toBe(1);
  });

  it('computeSignalIntegrity — topOffender populated for bot_author', () => {
    const raw = [commit1, botCommit];
    const filtered = [commit1];
    const report = computeSignalIntegrity(raw, filtered);
    const botSource = report.topNoiseSources.find(s => s.reason === 'bot_author');
    expect(botSource?.topOffender).toBe('dependabot[bot]');
  });

  it('computeSignalIntegrity — affectedAnalyzers deduped and sorted alphabetically', () => {
    const raw = [commit1, botCommit, mergeCommit];
    const filtered = [commit1];
    const report = computeSignalIntegrity(raw, filtered);
    // bot_author -> ['hotspots', 'contributors', 'burnout', 'knowledgeSilos']
    // merge_commit -> ['churn', 'temporalCoupling']
    expect(report.affectedAnalyzers).toContain('hotspots');
    expect(report.affectedAnalyzers).toContain('churn');
    expect(report.affectedAnalyzers).toEqual([...report.affectedAnalyzers].sort());
  });

  it('computeSignalIntegrity — handles empty rawCommits', () => {
    const report = computeSignalIntegrity([], []);
    expect(report.totalCommits).toBe(0);
    expect(report.noiseRatio).toBe(0);
  });
});
