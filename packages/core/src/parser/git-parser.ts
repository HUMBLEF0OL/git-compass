import { simpleGit, SimpleGit, LogResult, DefaultLogFields } from "simple-git";
import type { RawCommit, ParseOptions } from "../types.js";

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
 * Retrieves a list of all local branches.
 */
export async function getBranches(git: SimpleGit): Promise<string[]> {
  const result = await git.branchLocal();
  return result.all;
}














