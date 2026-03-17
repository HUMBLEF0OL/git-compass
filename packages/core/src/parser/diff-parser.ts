/**
 * Parses raw diff stat output into structured file change data.
 */
export function parseDiffStat(diff: string): string[] {
  // Scaffold implementation - to be refined in analyzer phase
  if (!diff) return [];
  return diff.split("\n").filter((line) => line.trim().length > 0);
}














