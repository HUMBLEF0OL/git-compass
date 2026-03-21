export const DEFAULT_EXCLUDE_PATTERNS = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "tsconfig.json",
  ".gitignore",
  ".npmignore",
  "LICENSE",
  "README.md",
  "*.config.js",
  "*.config.ts",
  ".eslintrc*",
  ".prettierrc*",
  ".pnp.cjs",
  ".pnp.loader.mjs",
  "node_modules/**",
  ".git/**",
  ".turbo/**",
  "release.yml",
  "release.yaml",
];

/**
 * Checks if a file path should be excluded based on patterns.
 */
export function shouldExclude(path: string, patterns: string[] = DEFAULT_EXCLUDE_PATTERNS): boolean {
  return patterns.some((pattern) => {
    // Basic glob-like support:
    // ** matches any directory
    // * matches any characters except /

    const regexSource = pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "(.+)")
      .replace(/\*/g, "([^/]+)")
      .replace(/\?/g, "(.)");

    const regex = new RegExp(`^${regexSource}$|^${regexSource}/|/${regexSource}$|/${regexSource}/`);
    return regex.test(path);
  });
}

/**
 * Extracts unique file paths from a simple-git diff object.
 */
export function extractFilesFromDiff(diff: unknown, excludePatterns?: string[]): string[] {
  if (!diff || typeof diff !== "object") return [];

  const diffObj = diff as { files?: Array<{ file: string }> };
  if (!diffObj.files) return [];

  return diffObj.files
    .map((f) => f.file)
    .filter((path) => !shouldExclude(path, excludePatterns));
}

export interface FileDiffImpact {
  file: string;
  insertions: number;
  deletions: number;
}

/**
 * Extracts per-file insertions and deletions from a simple-git diff object.
 */
export function extractImpactsFromDiff(diff: unknown, excludePatterns?: string[]): FileDiffImpact[] {
  if (!diff || typeof diff !== "object") return [];

  const diffObj = diff as { files?: Array<FileDiffImpact> };
  if (!diffObj.files) return [];

  return diffObj.files
    .filter((f) => !shouldExclude(f.file, excludePatterns))
    .map((f) => ({
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














