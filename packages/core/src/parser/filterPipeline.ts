import { GitCommit, FilterPipeline, FilterPipelineOptions, ClassifiedCommit, ClassifiedFile } from '../types/signal.js';
import { classifyCommit, isLockfileOnlyCommit } from './commitClassifier.js';
import { classifyFile } from './fileClassifier.js';

/**
 * Minimal wildcard matching for glob patterns.
 * Supports '*' (any characters except directory separators)
 * and '**' (any characters including directory separators).
 */
function matchesPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
  const normalizedPattern = pattern.toLowerCase().replace(/\\/g, '/');

  // Convert glob to regex
  // Escape special regex characters except *
  let regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape all except *
    .replace(/\*\*\//g, '(.*)?')           // **/ matches zero or more directories with trailing slash
    .replace(/\*\*/g, '.*')               // ** matches any char
    .replace(/\*/g, '[^/]*');             // * matches any char except /

  // Ensure it matches the whole string
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedPath);
}

/**
 * Creates a commit filtering pipeline.
 */
export function createFilterPipeline(options: FilterPipelineOptions = {}): FilterPipeline {
  const excludeCommitTypes = options.excludeCommitTypes ?? ['merge', 'bot'];
  const excludeFileCategories = options.excludeFileCategories ?? ['lockfile', 'generated', 'asset'];
  const excludePatterns = options.excludePatterns ?? [];
  const customBotPatterns = options.customBotPatterns ?? [];

  return {
    classifyCommit(commit: GitCommit): ClassifiedCommit {
      return classifyCommit(commit, customBotPatterns);
    },

    classifyFile(filePath: string): ClassifiedFile {
      return classifyFile(filePath);
    },

    filter(commits: GitCommit[]): GitCommit[] {
      return commits
        .map(commit => {
          // 1. Classify commit
          const classified = classifyCommit(commit, customBotPatterns);

          // 2. Filter by commit noise
          if (classified.isNoise && excludeCommitTypes.includes(classified.type)) {
            return null;
          }

          // 3. Classify and filter files
          const originalFiles = commit.files;
          const classifiedFiles = originalFiles.map((f: string) => classifyFile(f));

          let filteredFiles = originalFiles.filter((_: string, index: number) => {
            const cf = classifiedFiles[index];
            // Filter by file noise
            if (cf && cf.isNoise && excludeFileCategories.includes(cf.category)) {
              return false;
            }
            // 4. Apply glob patterns
            if (excludePatterns.some((p: string) => matchesPattern(cf!.filePath, p))) {
              return false;
            }
            return true;
          });

          // 5. Handle commits with zero files remaining
          if (filteredFiles.length === 0 && originalFiles.length > 0) {
            if (isLockfileOnlyCommit(commit, classifiedFiles)) {
              return null;
            }
          }

          // Return new commit object if modified, but the brief says "Return the filtered commit array. Do not mutate input."
          // It doesn't explicitly say to return a NEW GitCommit object if files are removed, 
          // but if we filter files, we must return a new commit object with the filtered files list.
          return {
            ...commit,
            files: filteredFiles,
          };
        })
        .filter((c): c is GitCommit => c !== null);
    },
  };
}
