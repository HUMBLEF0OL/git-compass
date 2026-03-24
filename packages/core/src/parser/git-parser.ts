import { simpleGit, SimpleGit } from "simple-git";
import type { RawCommit, ParseOptions } from "../types.js";
import type { BranchInfo } from "../types/analytics.js";
import type { GitCommit } from "../types/signal.js";

/**
 * Creates and initializes a SimpleGit instance for a given repository path.
 */
export function createGitParser(repoPath: string): SimpleGit {
  return simpleGit(repoPath);
}

/**
 * Checks if the provided directory is a valid Git repository.
 */
export async function isValidRepo(git: SimpleGit): Promise<boolean> {
  try {
    await git.status();
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves commit history for a repository.
 */
export async function getCommits(git: SimpleGit, options: ParseOptions = {}): Promise<RawCommit[]> {
  const { branch = "HEAD", since, until, maxCount = 500 } = options;

  const log = await git.log({
    [branch]: null,
    "--max-count": maxCount,
    "--stat": "4096",
    ...(since ? { "--since": since } : {}),
    ...(until ? { "--until": until } : {}),
  } as any);

  return log.all.map((commit: any) => ({
    hash: commit.hash,
    author: commit.author_name,
    email: commit.author_email,
    date: new Date(commit.date),
    message: commit.message,
    body: commit.body,
    diff: commit.diff ?? null,
  }));
}

/**
 * Retrieves the diff for a specific commit.
 */
export async function getFileDiff(git: SimpleGit, commitHash: string): Promise<string> {
  return git.show([commitHash, "--stat", "--name-only"]);
}

/**
 * Retrieves the name of the current branch.
 */
export async function getCurrentBranch(git: SimpleGit): Promise<string> {
  const result = await git.branch();
  return result.current;
}

/**
 * Retrieves a list of all branches with details.
 */
export async function getBranches(git: SimpleGit): Promise<BranchInfo[]> {
  const result = await git.raw([
    'branch',
    '-a',
    '--sort=-committerdate',
    '--format=%(refname) %(objectname) %(committerdate:iso8601) %(authorname) %(authoremail)'
  ]);

  return result
    .split('\n')
    .filter((line: string) => line.trim() !== '')
    .map((line: string) => {
      const parts = line.trim().split(' ');
      const refname = parts[0] || '';
      const hash = parts[1] || '';
      const date = parts[2] || '';
      const authorParts = parts.slice(3);

      const isRemote = refname.startsWith('refs/remotes/');
      let name = refname.replace(/^refs\/(heads|remotes)\//, '');
      if (isRemote) {
        name = name.replace(/^origin\//, '');
      }

      const lastCommitAuthor = authorParts.join(' ');

      return {
        name,
        isRemote,
        lastCommitHash: hash,
        lastCommitDate: date,
        lastCommitAuthor,
      };
    })
    .filter((branch: BranchInfo) => branch.name !== 'HEAD' && !branch.name.endsWith('/HEAD'));
}

/**
 * Retrieves enhanced commit data for analytical modules.
 */
export async function getEnhancedCommits(git: SimpleGit, options: ParseOptions = {}): Promise<GitCommit[]> {
  const { branch = "HEAD", maxCount = 500 } = options;

  const log = await git.log({
    [branch]: null,
    "--max-count": maxCount,
    "--stat": "4096",
    format: {
      hash: "%H",
      parents: "%P",
      authorName: "%an",
      authorEmail: "%ae",
      date: "%aI",
      message: "%B",
    }
  } as any);

  return log.all.map((commit: any) => {
    // Extract files from diff object if available
    const files = commit.diff ? commit.diff.files.map((f: any) => f.file) : [];

    return {
      hash: commit.hash,
      message: commit.message,
      author: { 
        name: commit.authorName, 
        email: commit.authorEmail 
      },
      date: commit.date,
      parents: commit.parents ? commit.parents.split(' ').filter((p: string) => p !== '') : [],
      files,
      // Carry over raw fields for P1 compatibility via any casting
      email: commit.authorEmail,
      dateObj: new Date(commit.date),
      diff: commit.diff
    } as any;
  });
}

/**
 * Retrieves commits since a specific point in history.
 */
export async function getCommitsSince(
  git: SimpleGit, 
  since: string, 
  options: { maxCount?: number } = {}
): Promise<GitCommit[]> {
  const { maxCount = 10000 } = options;
  const isSha = /^[0-9a-f]{4,40}$/i.test(since);
  
  const logOptions: any = {
    "--max-count": maxCount,
    "--stat": "4096",
    format: {
      hash: "%H",
      parents: "%P",
      authorName: "%an",
      authorEmail: "%ae",
      date: "%aI",
      message: "%B",
    }
  };

  if (isSha) {
    logOptions.from = since;
    logOptions.to = "HEAD";
  } else {
    logOptions["--after"] = since;
  }

  const log = await git.log(logOptions);

  return log.all.map((commit: any) => {
    const files = commit.diff ? commit.diff.files.map((f: any) => f.file) : [];
    return {
      hash: commit.hash,
      message: commit.message,
      author: { 
        name: commit.authorName, 
        email: commit.authorEmail 
      },
      date: commit.date,
      parents: commit.parents ? commit.parents.split(' ').filter((p: string) => p !== '') : [],
      files,
      email: commit.authorEmail,
      dateObj: new Date(commit.date),
      diff: commit.diff
    } as any;
  });
}
