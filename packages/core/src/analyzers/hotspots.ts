import type { GitCommit } from "../types/signal.js";
import type { WindowDays, ISODateString } from "../types/analytics.js";
import type { HotspotReport, HotspotEntry } from "../types/extended.js";

/**
 * Identifies hotspots in a repository based on change frequency and author diversity.
 * Pure function.
 */
export function analyzeHotspots(
  commits: GitCommit[],
  windowDays: WindowDays = 30,
): HotspotReport {
  if (commits.length === 0) {
    return {
      hotspots: [],
      windowDays,
      generatedAt: new Date().toISOString()
    };
  }

  // Calculate cutoff based on windowDays
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * 86_400_000);
  
  const filtered = commits.filter((c) => new Date(c.date) >= cutoff);

  const fileMap = new Map<
    string,
    { changeCount: number; authors: Set<string>; lastChanged: ISODateString }
  >();

  for (const commit of filtered) {
    for (const filePath of commit.files) {
      const existing = fileMap.get(filePath) ?? {
        changeCount: 0,
        authors: new Set<string>(),
        lastChanged: commit.date,
      };
      
      existing.changeCount++;
      existing.authors.add(commit.author.email);
      
      if (new Date(commit.date) > new Date(existing.lastChanged)) {
        existing.lastChanged = commit.date;
      }
      
      fileMap.set(filePath, existing);
    }
  }

  const hotspots: HotspotEntry[] = Array.from(fileMap.entries())
    .map(([path, data]) => ({
      path,
      changeCount: data.changeCount,
      uniqueAuthors: data.authors.size,
      lastChanged: data.lastChanged,
    }))
    .sort((a, b) => b.changeCount - a.changeCount);

  return {
    hotspots,
    windowDays,
    generatedAt: new Date().toISOString(),
  };
}

