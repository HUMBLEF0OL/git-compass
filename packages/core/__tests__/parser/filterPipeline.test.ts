import { describe, it, expect } from 'vitest';
import { createFilterPipeline } from '../../src/parser/filterPipeline.js';
import { GitCommit } from '../../src/types/signal.js';

describe('filterPipeline', () => {
  const baseCommit: GitCommit = {
    hash: '1',
    message: 'feat: valid',
    author: { name: 'User', email: 'user@example.com' },
    date: '2023-01-01',
    parents: ['0'],
    files: ['src/main.ts', 'package.json'],
  };

  const mergeCommit: GitCommit = {
    ...baseCommit,
    hash: '2',
    message: 'Merge branch main',
    parents: ['1', '0'],
  };

  const botCommit: GitCommit = {
    ...baseCommit,
    hash: '3',
    message: 'chore: update deps',
    author: { name: 'dependabot[bot]', email: 'bot@example.com' },
  };

  const lockfileCommit: GitCommit = {
    ...baseCommit,
    hash: '4',
    message: 'chore: update lock',
    files: ['package-lock.json'],
  };

  const mixedCommit: GitCommit = {
    ...baseCommit,
    hash: '5',
    message: 'feat: mixed changes',
    files: ['src/main.ts', 'package-lock.json', 'dist/bundle.js'],
  };

  const pipeline = createFilterPipeline();

  it('filter — removes merge commits by default', () => {
    const commits = [baseCommit, mergeCommit];
    const filtered = pipeline.filter(commits);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].hash).toBe('1');
  });

  it('filter — removes bot commits by default', () => {
    const commits = [baseCommit, botCommit];
    const filtered = pipeline.filter(commits);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].hash).toBe('1');
  });

  it('filter — keeps feat/fix/unknown commits', () => {
    const unknownCommit = { ...baseCommit, hash: '6', message: 'random message' };
    const filtered = pipeline.filter([baseCommit, unknownCommit]);
    expect(filtered).toHaveLength(2);
  });

  it('filter — removes noise files from commits', () => {
    const filtered = pipeline.filter([mixedCommit]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].files).toEqual(['src/main.ts']);
  });

  it('filter — keeps config files', () => {
    const configCommit = { ...baseCommit, files: ['src/main.ts', 'tsconfig.json'] };
    const filtered = pipeline.filter([configCommit]);
    expect(filtered[0].files).toContain('tsconfig.json');
  });

  it('filter — applies excludePatterns glob correctly', () => {
    const customPipeline = createFilterPipeline({ excludePatterns: ['src/**/*.ts'] });
    const filtered = customPipeline.filter([baseCommit]);
    expect(filtered[0].files).not.toContain('src/main.ts');
    expect(filtered[0].files).toContain('package.json');
  });

  it('filter — simple wildcard * matching', () => {
    const customPipeline = createFilterPipeline({ excludePatterns: ['*.json'] });
    const filtered = customPipeline.filter([baseCommit]);
    expect(filtered[0].files).not.toContain('package.json');
    expect(filtered[0].files).toContain('src/main.ts');
  });

  it('filter — custom excludeCommitTypes override', () => {
    const customPipeline = createFilterPipeline({ excludeCommitTypes: [] });
    const filtered = customPipeline.filter([mergeCommit, botCommit]);
    expect(filtered).toHaveLength(2);
  });

  it('filter — custom excludeFileCategories override', () => {
    const customPipeline = createFilterPipeline({ excludeFileCategories: [] });
    const filtered = customPipeline.filter([lockfileCommit]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].files).toContain('package-lock.json');
  });

  it('filter — does not mutate input array', () => {
    const commits = [baseCommit, mergeCommit];
    pipeline.filter(commits);
    expect(commits).toHaveLength(2);
  });

  it('filter — commit with all files removed and originally lockfile-only is excluded', () => {
    const filtered = pipeline.filter([lockfileCommit]);
    expect(filtered).toHaveLength(0);
  });

  it('filter — commit with all files removed but not lockfile-only is kept', () => {
    // A commit with files that are all excluded by custom patterns but NOT categorization
    const customPipeline = createFilterPipeline({ excludePatterns: ['src/main.ts', 'package.json'] });
    const filtered = customPipeline.filter([baseCommit]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].files).toHaveLength(0);
  });

  it('classifyCommit — delegates correctly', () => {
    const result = pipeline.classifyCommit(botCommit);
    expect(result.type).toBe('bot');
  });

  it('classifyFile — delegates correctly', () => {
    const result = pipeline.classifyFile('package-lock.json');
    expect(result.category).toBe('lockfile');
  });
});
