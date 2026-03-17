import type { RawCommit, KnowledgeSilo } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";


/**
 * Identifies knowledge silos where a single person owns the vast majority of a file's history.
 */
export function analyzeKnowledge(commits: RawCommit[]): KnowledgeSilo[] {
  const fileAuthorMap = new Map<string, Map<string, number>>();

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff);

    for (const file of files) {
      const authorMap = fileAuthorMap.get(file) ?? new Map<string, number>();
      authorMap.set(commit.author, (authorMap.get(commit.author) || 0) + 1);
      fileAuthorMap.set(file, authorMap);
    }
  }

  const results: KnowledgeSilo[] = [];

  for (const [path, authorMap] of fileAuthorMap.entries()) {
    const totalChanges = Array.from(authorMap.values()).reduce((a, b) => a + b, 0);
    if (totalChanges < 5) continue; // Only report on non-trivial history

    let mainContributor = "";
    let maxChanges = 0;

    for (const [author, count] of authorMap.entries()) {
      if (count > maxChanges) {
        maxChanges = count;
        mainContributor = author;
      }
    }

    const authorshipPercent = Math.round((maxChanges / totalChanges) * 100);

    if (authorshipPercent >= 70) {
      const riskLevel: KnowledgeSilo["riskLevel"] = 
        authorshipPercent >= 90 ? "high" : 
        authorshipPercent >= 80 ? "medium" : "low";

      results.push({
        path,
        mainContributor,
        authorshipPercent,
        riskLevel
      });
    }
  }

  return results.sort((a, b) => b.authorshipPercent - a.authorshipPercent);
}

