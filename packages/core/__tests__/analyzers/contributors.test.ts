import { describe, it, expect } from 'vitest';
import { deduplicateContributors } from '../../src/analyzers/contributor.js';
import { ContributorStats } from '../../src/types.js';

describe('deduplicateContributors', () => {
  const alice1: ContributorStats = {
    author: 'Alice',
    email: 'alice@example.com',
    commitCount: 10,
    linesAdded: 100,
    linesRemoved: 10,
    filesChanged: 5,
    firstCommit: new Date('2023-01-01'),
    lastCommit: new Date('2023-01-10'),
    activeDays: 5,
  };

  const alice2: ContributorStats = {
    ...alice1,
    author: 'Alice Doe',
    email: 'alice@work.com',
  };

  const bob: ContributorStats = {
    author: 'Bob',
    email: 'bob@example.com',
    commitCount: 5,
    linesAdded: 50,
    linesRemoved: 5,
    filesChanged: 2,
    firstCommit: new Date('2023-01-01'),
    lastCommit: new Date('2023-01-05'),
    activeDays: 3,
  };

  const bot: ContributorStats = {
    author: 'dependabot[bot]',
    email: 'bot@example.com',
    commitCount: 1,
    linesAdded: 1,
    linesRemoved: 0,
    filesChanged: 1,
    firstCommit: new Date('2023-01-01'),
    lastCommit: new Date('2023-01-01'),
    activeDays: 1,
  };

  it('deduplicateContributors — same email different name → single canonical, most frequent name wins', () => {
    const aliceAlt: ContributorStats = { ...alice1, author: 'Alice A.' };
    // Alice appears twice, Alice A. once. Alice should be canonical name.
    const result = deduplicateContributors([alice1, alice1, aliceAlt]);
    expect(result.canonical).toHaveLength(1);
    expect(result.canonical[0].canonicalName).toBe('Alice');
    expect(result.canonical[0].canonicalEmail).toBe('alice@example.com');
  });

  it('deduplicateContributors — identityMap merges two emails into one canonical', () => {
    const result = deduplicateContributors([alice1, alice2], {
      identityMap: { 'alice@work.com': 'alice@example.com' }
    });
    expect(result.canonical).toHaveLength(1);
    expect(result.canonical[0].canonicalEmail).toBe('alice@example.com');
    expect(result.canonical[0].aliases).toContain('alice@work.com');
  });

  it('deduplicateContributors — bot contributors removed from canonical, present in botsRemoved', () => {
    const result = deduplicateContributors([alice1, bot]);
    expect(result.canonical).toHaveLength(1);
    expect(result.canonical[0].canonicalName).toBe('Alice');
    expect(result.botsRemoved).toContain('bot@example.com');
  });

  it('deduplicateContributors — case-insensitive email grouping', () => {
    const aliceUpper: ContributorStats = { ...alice1, email: 'ALICE@EXAMPLE.COM' };
    const result = deduplicateContributors([alice1, aliceUpper]);
    expect(result.canonical).toHaveLength(1);
    expect(result.canonical[0].canonicalEmail).toBe('alice@example.com');
  });

  it('deduplicateContributors — empty input returns empty canonical and botsRemoved', () => {
    const result = deduplicateContributors([]);
    expect(result.canonical).toHaveLength(0);
    expect(result.botsRemoved).toHaveLength(0);
  });
});
