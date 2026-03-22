import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCachePath, loadCache, getCachedResult, updateCache } from "../cache.js";
import fs from "fs/promises";
import path from "path";

vi.mock("fs/promises");

describe("Cache Utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should generate correct cache path", async () => {
    const repoRoot = "/test/repo";
    const cachePath = await getCachePath(repoRoot);
    expect(cachePath).toBe(path.join(repoRoot, ".git-compass", "cache.json"));
  });

  it("should load empty cache if file does not exist", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));
    const cache = await loadCache("/path/to/cache.json");
    expect(cache).toEqual({});
  });

  it("should retrieve cached result", () => {
    const cache = {
      repo: {
        hash1: { data: "test" } as any,
      },
    };
    const result = getCachedResult(cache, "/test/repo", "hash1");
    expect(result).toEqual({ data: "test" });
  });

  it("should update cache accurately", () => {
    const cache = {};
    const updated = updateCache(cache, "/test/repo", "hash1", { some: "data" } as any);
    expect(updated["repo"]).toBeDefined();
    if (updated["repo"]) {
      expect(updated["repo"]["hash1"]).toEqual({ some: "data" });
    }
  });
});
