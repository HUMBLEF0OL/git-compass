import { simpleGit, SimpleGit } from "simple-git";
import type { BranchInfo, WindowDays } from "../types/analytics.js";
import type { GitCommit } from "../types/signal.js";

export interface ParseOptions {
  branch?: string;
  window?: WindowDays;
  maxCount?: number;
  since?: string;
  until?: string;
  excludePatterns?: string[];
}

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
 * Retrieves the diff for a specific commit hash (filenames only).
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
    };
  });
}

