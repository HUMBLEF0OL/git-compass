import { describe, it, expect, vi } from 'vitest';
import { getBranches, getCommitsSince } from '../../src/parser/git-parser.js';
import { SimpleGit } from 'simple-git';

describe('getBranches', () => {
  it('returns BranchInfo[] with correct fields', async () => {
    const mockRaw = vi.fn().mockResolvedValue(`
refs/heads/master abc1234 2024-03-15T10:22:00Z Alice <alice@example.com>
refs/remotes/origin/feat/auth def5678 2024-03-16T11:00:00Z Bob <bob@example.com>
`.trim());
    const mockGit = { raw: mockRaw } as unknown as SimpleGit;

    const branches = await getBranches(mockGit);

    expect(branches).toHaveLength(2);
    expect(branches[0]).toEqual({
      name: 'master',
      isRemote: false,
      lastCommitHash: 'abc1234',
      lastCommitDate: '2024-03-15T10:22:00Z',
      lastCommitAuthor: 'Alice <alice@example.com>',
    });
    expect(branches[1]).toEqual({
      name: 'feat/auth',
      isRemote: true,
      lastCommitHash: 'def5678',
      lastCommitDate: '2024-03-16T11:00:00Z',
      lastCommitAuthor: 'Bob <bob@example.com>',
    });
  });

  it('strips remotes/origin/ prefix from remote branch names', async () => {
    const mockRaw = vi.fn().mockResolvedValue('refs/remotes/origin/develop hash date author');
    const mockGit = { raw: mockRaw } as unknown as SimpleGit;
    const branches = await getBranches(mockGit);
    expect(branches[0].name).toBe('develop');
  });

  it('excludes HEAD pseudo-branch', async () => {
    const mockRaw = vi.fn().mockResolvedValue(`
refs/heads/master h1 d1 a1
refs/remotes/origin/HEAD h2 d2 a2
`.trim());
    const mockGit = { raw: mockRaw } as unknown as SimpleGit;
    const branches = await getBranches(mockGit);
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('master');
  });

  it('sorts by lastCommitDate descending is handled by git', async () => {
    // The sorting is requested in the git command, so we just verify it passes it through
    const mockRaw = vi.fn().mockResolvedValue('');
    const mockGit = { raw: mockRaw } as unknown as SimpleGit;
    await getBranches(mockGit);
    expect(mockRaw).toHaveBeenCalledWith(expect.arrayContaining(['--sort=-committerdate']));
  });

  it('propagates simple-git errors', async () => {
    const mockRaw = vi.fn().mockRejectedValue(new Error('Git error'));
    const mockGit = { raw: mockRaw } as unknown as SimpleGit;
    await expect(getBranches(mockGit)).rejects.toThrow('Git error');
  });
});

describe('getCommitsSince', () => {
  it('detects SHA input by hex pattern', async () => {
    const mockLog = vi.fn().mockResolvedValue({ all: [] });
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    
    await getCommitsSince(mockGit, 'abc1234');
    
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      from: 'abc1234',
      to: 'HEAD'
    }));
  });

  it('detects ISO date input (non-hex string)', async () => {
    const mockLog = vi.fn().mockResolvedValue({ all: [] });
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    
    const date = '2024-01-01T00:00:00Z';
    await getCommitsSince(mockGit, date);
    
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      '--after': date
    }));
  });

  it('returns [] when no commits found after SHA', async () => {
    const mockLog = vi.fn().mockResolvedValue({ all: [] });
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    const result = await getCommitsSince(mockGit, 'abc1234');
    expect(result).toEqual([]);
  });

  it('returns commits with correct shape', async () => {
    const mockLog = vi.fn().mockResolvedValue({
      all: [{
        hash: 'h1',
        authorName: 'A',
        authorEmail: 'e',
        date: '2024-01-01T00:00:00Z',
        message: 'm',
        parents: 'p1 p2',
        diff: { files: [{ file: 'f1' }] }
      }]
    });
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    
    const result = await getCommitsSince(mockGit, 'h0');
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hash: 'h1',
      message: 'm',
      author: { name: 'A', email: 'e' },
      parents: ['p1', 'p2'],
      files: ['f1']
    });
  });

  it('respects maxCount option', async () => {
    const mockLog = vi.fn().mockResolvedValue({ all: [] });
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    
    await getCommitsSince(mockGit, 'abc1234', { maxCount: 50 });
    
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      '--max-count': 50
    }));
  });

  it('propagates simple-git errors', async () => {
    const mockLog = vi.fn().mockRejectedValue(new Error('Git error'));
    const mockGit = { log: mockLog } as unknown as SimpleGit;
    await expect(getCommitsSince(mockGit, 'abc1234')).rejects.toThrow('Git error');
  });
});
