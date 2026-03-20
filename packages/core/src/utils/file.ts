/**
 * Extracts unique file paths from a simple-git diff object.
 */
export function extractFilesFromDiff(diff: unknown): string[] {
  if (!diff || typeof diff !== "object") return [];

  const diffObj = diff as { files?: Array<{ file: string }> };
  if (!diffObj.files) return [];

  return diffObj.files.map((f) => f.file);
}

export interface FileDiffImpact {
  file: string;
  insertions: number;
  deletions: number;
}

/**
 * Extracts per-file insertions and deletions from a simple-git diff object.
 */
export function extractImpactsFromDiff(diff: unknown): FileDiffImpact[] {
  if (!diff || typeof diff !== "object") return [];

  const diffObj = diff as { files?: Array<FileDiffImpact> };
  if (!diffObj.files) return [];

  return diffObj.files.map((f) => ({
    file: f.file,
    insertions: f.insertions || 0,
    deletions: f.deletions || 0,
  }));
}

/**
 * Normalizes a file path.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}














