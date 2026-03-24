import { describe, it, expect } from 'vitest';
import { classifyCommit, isLockfileOnlyCommit } from '../../src/parser/commitClassifier.js';
import { GitCommit } from '../../src/types/signal.js';

describe('commitClassifier', () => {
  const baseCommit: GitCommit = {
    hash: '123',
    message: 'feat: add something',
    author: { name: 'John Doe', email: 'john@example.com' },
    date: '2023-01-01',
    parents: ['abc'],
    files: ['src/index.ts'],
  };

  describe('classifyCommit', () => {
    it('should classify merge: commit with 2 parents', () => {
      const commit = { ...baseCommit, parents: ['abc', 'def'] };
      const result = classifyCommit(commit);
      expect(result.type).toBe('merge');
      expect(result.isNoise).toBe(true);
      expect(result.noiseReason).toBe('merge_commit');
    });

    it('should classify merge: message "Merge pull request #42"', () => {
      const commit = { ...baseCommit, message: 'Merge pull request #42 from some/branch' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('merge');
      expect(result.isNoise).toBe(true);
    });

    it('should classify merge: message "Merge branch \'main\'"', () => {
      const commit = { ...baseCommit, message: "Merge branch 'main' into dev" };
      const result = classifyCommit(commit);
      expect(result.type).toBe('merge');
      expect(result.isNoise).toBe(true);
    });

    it('should classify bot: email contains "dependabot"', () => {
      const commit = { ...baseCommit, author: { name: 'dependabot', email: 'dependabot[bot]@users.noreply.github.com' } };
      const result = classifyCommit(commit);
      expect(result.type).toBe('bot');
      expect(result.isNoise).toBe(true);
      expect(result.noiseReason).toBe('bot_author');
    });

    it('should classify bot: name ends with "[bot]"', () => {
      const commit = { ...baseCommit, author: { name: 'github-actions[bot]', email: 'actions@github.com' } };
      const result = classifyCommit(commit);
      expect(result.type).toBe('bot');
      expect(result.isNoise).toBe(true);
    });

    it('should classify bot: email contains "noreply@"', () => {
      const commit = { ...baseCommit, author: { name: 'Some Bot', email: 'bot@noreply.github.com' } };
      const result = classifyCommit(commit);
      expect(result.type).toBe('bot');
      expect(result.isNoise).toBe(true);
    });

    it('should classify bot: custom pattern match', () => {
      const commit = { ...baseCommit, author: { name: 'CI Runner', email: 'ci@company.com' } };
      const result = classifyCommit(commit, ['CI Runner']);
      expect(result.type).toBe('bot');
      expect(result.isNoise).toBe(true);
    });

    it('should classify revert: message starts with \'Revert "\'', () => {
      const commit = { ...baseCommit, message: 'Revert "feat: add something"' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('revert');
      expect(result.isNoise).toBe(true);
      expect(result.noiseReason).toBe('revert_commit');
    });

    it('should classify release: chore(release): message', () => {
      const commit = { ...baseCommit, message: 'chore(release): 1.0.0' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('release');
      expect(result.isNoise).toBe(true);
      expect(result.noiseReason).toBe('release_commit');
    });

    it('should classify release: "Bump lodash from 4.0 to 4.1"', () => {
      const commit = { ...baseCommit, message: 'Bump lodash from 4.17.20 to 4.17.21' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('release');
      expect(result.isNoise).toBe(true);
    });

    it('should classify feat: conventional commit', () => {
      const result = classifyCommit(baseCommit);
      expect(result.type).toBe('feat');
      expect(result.isNoise).toBe(false);
      expect(result.noiseReason).toBe(null);
    });

    it('should classify fix: conventional commit', () => {
      const commit = { ...baseCommit, message: 'fix: bug in parser' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('fix');
      expect(result.isNoise).toBe(false);
    });

    it('should classify unknown: no match', () => {
      const commit = { ...baseCommit, message: 'random message' };
      const result = classifyCommit(commit);
      expect(result.type).toBe('unknown');
      expect(result.isNoise).toBe(false);
    });

    it('should prioritize merge over bot', () => {
      // Parent count > 1 AND bot author
      const commit = { 
        ...baseCommit, 
        parents: ['abc', 'def'], 
        author: { name: 'dependabot[bot]', email: 'bot@example.com' } 
      };
      const result = classifyCommit(commit);
      expect(result.type).toBe('merge');
    });
  });

  describe('isLockfileOnlyCommit', () => {
    it('should return true if all files are lockfiles or generated', () => {
      const files = [
        { filePath: 'package-lock.json', category: 'lockfile' as const, isNoise: true, noiseReason: 'lockfile' },
        { filePath: 'dist/bundle.js', category: 'generated' as const, isNoise: true, noiseReason: 'generated' },
      ];
      expect(isLockfileOnlyCommit(baseCommit, files)).toBe(true);
    });

    it('should return false if there are mixed files', () => {
      const files = [
        { filePath: 'package-lock.json', category: 'lockfile' as const, isNoise: true, noiseReason: 'lockfile' },
        { filePath: 'src/index.ts', category: 'source' as const, isNoise: false, noiseReason: null },
      ];
      expect(isLockfileOnlyCommit(baseCommit, files)).toBe(false);
    });

    it('should return false if files list is empty', () => {
      expect(isLockfileOnlyCommit(baseCommit, [])).toBe(false);
    });
  });
});
