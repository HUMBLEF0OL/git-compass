import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGitParser, isValidRepo, getCommits, getCurrentBranch } from "../src/parser/git-parser.js";
import simpleGit from "simple-git";

vi.mock("simple-git");

describe("GitParser Functions", () => {
  const mockRepoPath = "/mock/repo";
  let mockGit: any;

  beforeEach(() => {
    mockGit = {
      status: vi.fn(),
      log: vi.fn(),
      branch: vi.fn(),
      show: vi.fn(),
    };
    (simpleGit as any).mockReturnValue(mockGit);
  });

  it("should validate a repository", async () => {
    mockGit.status.mockResolvedValue({});
    const git = createGitParser(mockRepoPath);
    const isValid = await isValidRepo(git);
    expect(isValid).toBe(true);
    expect(mockGit.status).toHaveBeenCalled();
  });

  it("should return false for invalid repository", async () => {
    mockGit.status.mockRejectedValue(new Error("Not a repo"));
    const git = createGitParser(mockRepoPath);
    const isValid = await isValidRepo(git);
    expect(isValid).toBe(false);
  });

  it("should fetch commits", async () => {
    const mockLogResult = {
      all: [
        {
          hash: "abc",
          author_name: "John Doe",
          author_email: "john@example.com",
          date: "2024-01-01",
          message: "Commit message",
          body: "Commit body",
          diff: { files: [] },
        },
      ],
    };
    mockGit.log.mockResolvedValue(mockLogResult);

    const git = createGitParser(mockRepoPath);
    const commits = await getCommits(git, { maxCount: 1 });
    expect(commits).toHaveLength(1);
    expect(commits[0]?.hash).toBe("abc");
    expect(commits[0]?.author).toBe("John Doe");
    expect(commits[0]?.date).toBeInstanceOf(Date);
  });

  it("should fetch current branch", async () => {
    mockGit.branch.mockResolvedValue({ current: "main" });
    const git = createGitParser(mockRepoPath);
    const branch = await getCurrentBranch(git);
    expect(branch).toBe("main");
  });
});
