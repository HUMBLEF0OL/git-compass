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
  options: { maxCount?: number; branch?: string } = {}
): Promise<GitCommit[]> {
  const { maxCount = 10000, branch = "HEAD" } = options;
  const isPureNumber = /^\d+$/.test(since.toString());
  // It's a SHA if it matches hex string and isn't purely numeric (or if it's purely numeric but exactly 40 chars)
  const isSha = /^[0-9a-f]{4,40}$/i.test(since) && (!isPureNumber || since.length === 40);
  
  const args: string[] = [
    `--max-count=${maxCount}`,
    "--stat=4096",
  ];

  if (since && since !== 'all') {
    if (isSha) {
       args.push(since);
       args.push("HEAD");
    } else {
      const daysStr = since.toLowerCase();
      if (daysStr.endsWith("d")) {
        const days = daysStr.slice(0, -1);
        args.push(`--since=${days} days ago`);
      } else {
        const days = parseInt(since, 10);
        if (isPureNumber && !isNaN(days)) {
          args.push(`--since=${days} days ago`);
        } else {
          args.push(`--since=${since}`);
        }
      }
    }
  }

  if (!isSha && branch) {
    args.push(branch);
  }

  const logResult = await git.log(args);
  
  // Fetch parents separately to avoid breaking simple-git's diff parser
  const parentArgs = args.filter(arg => !arg.startsWith('--stat'));
  const parentsRaw = await git.raw(['log', ...parentArgs, '--format=%H %P']);
  const parentMap = new Map<string, string[]>();
  
  parentsRaw.split('\n').forEach(line => {
    const parts = line.trim().split(' ');
    const hash = parts[0];
    if (hash) {
      parentMap.set(hash, parts.slice(1));
    }
  });
  
  return logResult.all.map((commit: any) => {
    const hash = commit.hash;
    const parents = parentMap.get(hash) || [];
    // Combine subject and body for full message analysis
    const fullMessage = commit.body ? `${commit.message}\n\n${commit.body}` : commit.message;

    return {
      hash,
      parents,
      author: {
        name: commit.author_name || 'Unknown',
        email: commit.author_email || 'unknown@example.com'
      },
      date: commit.date,
      message: fullMessage,
      files: commit.diff ? commit.diff.files.map((f: any) => f.file).filter(Boolean) : [],
      insertions: commit.diff?.insertions || 0,
      deletions: commit.diff?.deletions || 0
    } as GitCommit;
  });
}
