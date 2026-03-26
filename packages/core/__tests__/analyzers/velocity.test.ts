import { describe, it, expect } from 'vitest';
// @ts-ignore
import { 
  computeVelocityWindows, 
  detectVelocityAnomalies, 
  computeContributorVelocity, 
  computeDeliveryConsistency 
} from '../../src/analyzers/velocity.js';
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

describe('computeVelocityWindows', () => {
  it('groups commits into windows correctly', () => {
    const commits = [
      makeCommit({ date: '2024-03-01T10:00:00Z' }),
      makeCommit({ date: '2024-03-02T10:00:00Z' }),
      makeCommit({ date: '2024-03-10T10:00:00Z' }),
    ];
    const windows = computeVelocityWindows(commits, 7);
    expect(windows).toHaveLength(2);
    expect(windows[0].commitCount).toBe(2);
    expect(windows[1].commitCount).toBe(1);
  });
});

describe('detectVelocityAnomalies', () => {
  it('detects spikes', () => {
    const windows = [
      { windowStart: '', windowEnd: '', commitCount: 1, filesChanged: 1, linesAdded: 0, linesRemoved: 0, activeContributors: 1 },
      { windowStart: '', windowEnd: '', commitCount: 1, filesChanged: 1, linesAdded: 0, linesRemoved: 0, activeContributors: 1 },
      { windowStart: '', windowEnd: '', commitCount: 100, filesChanged: 1, linesAdded: 0, linesRemoved: 0, activeContributors: 1 },
    ];
    const anomalies = detectVelocityAnomalies(windows, { zScoreThreshold: 1.0 });
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe('spike');
  });
});

describe('computeDeliveryConsistency', () => {
  it('calculates rating based on CV', () => {
    const windows = [
      { windowStart: '', windowEnd: '', commitCount: 10, filesChanged: 1, linesAdded: 0, linesRemoved: 0, activeContributors: 1 },
      { windowStart: '', windowEnd: '', commitCount: 11, filesChanged: 1, linesAdded: 0, linesRemoved: 0, activeContributors: 1 },
    ];
    const consistency = computeDeliveryConsistency(windows);
    expect(consistency.rating).toBe('consistent');
  });
});
