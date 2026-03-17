/**
 * Extracts unique file paths from a simple-git diff object.
 */
export function extractFilesFromDiff(diff: unknown): string[] {
  if (!diff || typeof diff !== "object") return [];
  
  const diffObj = diff as { files?: Array<{ file: string }> };
  if (!diffObj.files) return [];

  return diffObj.files.map((f) => f.file);
}

/**
 * Normalizes a file path.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}














