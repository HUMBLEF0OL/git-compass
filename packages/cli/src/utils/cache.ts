import fs from "fs/promises";
import path from "path";
import type { AnalysisResult } from "@git-compass/core";

export interface CacheData {
  [repoKey: string]: {
    [commitHash: string]: AnalysisResult;
  };
}

const MAX_CACHE_ENTRIES_PER_REPO = 3;

export async function getCachePath(repoRoot: string): Promise<string> {
  return path.join(repoRoot, ".git-compass", "cache.json");
}

export async function loadCache(cachePath: string): Promise<CacheData> {
  try {
    const data = await fs.readFile(cachePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

export async function saveCache(cachePath: string, data: CacheData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save cache:", err);
  }
}

export function getCachedResult(
  cache: CacheData,
  repoRoot: string,
  commitHash: string
): AnalysisResult | null {
  const repoName = path.basename(repoRoot);
  return cache[repoName]?.[commitHash] || null;
}

export function updateCache(
  cache: CacheData,
  repoRoot: string,
  commitHash: string,
  result: AnalysisResult
): CacheData {
  const repoName = path.basename(repoRoot);
  
  if (!cache[repoName]) {
    cache[repoName] = {};
  }

  // Add new result
  cache[repoName][commitHash] = result;

  // Enforce size limit (keep only the most recent entries)
  const hashes = Object.keys(cache[repoName]);
  if (hashes.length > MAX_CACHE_ENTRIES_PER_REPO) {
    // Basic strategy: Remove oldest added hash (first key in object)
    // In a more advanced version we would use timestamps, but for "lightweight" this is fine.
    const hashToRemove = hashes[0];
    if (hashToRemove) delete cache[repoName][hashToRemove];
  }

  return cache;
}



