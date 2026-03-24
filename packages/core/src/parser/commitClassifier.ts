import { GitCommit, ClassifiedCommit, ClassifiedFile } from '../types/signal.js';

/**
 * Classifies a commit based on its metadata and message.
 */
export function classifyCommit(commit: GitCommit, customBotPatterns: string[] = []): ClassifiedCommit {
  const { message, author, parents } = commit;
  const lowerMessage = message.trim();
  const lowerEmail = author.email.toLowerCase();
  const lowerName = author.name.toLowerCase();

  // 1. Merge detection
  if (
    parents.length > 1 ||
    lowerMessage.startsWith('Merge pull request') ||
    lowerMessage.startsWith('Merge branch')
  ) {
    return { commit, type: 'merge', isNoise: true, noiseReason: 'merge_commit' };
  }

  // 2. Bot detection
  const isBotAuthor =
    lowerEmail.includes('bot@') ||
    lowerEmail.includes('noreply@') ||
    lowerEmail.includes('dependabot') ||
    lowerEmail.includes('renovate[bot]') ||
    author.name.endsWith('[bot]') ||
    customBotPatterns.some(pattern => {
      const p = pattern.toLowerCase();
      return lowerEmail.includes(p) || lowerName.includes(p);
    });

  if (isBotAuthor) {
    return { commit, type: 'bot', isNoise: true, noiseReason: 'bot_author' };
  }

  // 3. Revert detection
  if (lowerMessage.startsWith('Revert "')) {
    return { commit, type: 'revert', isNoise: true, noiseReason: 'revert_commit' };
  }

  // 4. Release detection
  if (
    lowerMessage.startsWith('chore(release):') ||
    /Bump .+ from .+ to .+/.test(message)
  ) {
    return { commit, type: 'release', isNoise: true, noiseReason: 'release_commit' };
  }

  // 5-12. Conventional Commits
  if (lowerMessage.startsWith('feat:') || lowerMessage.startsWith('feat(')) {
    return { commit, type: 'feat', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('fix:') || lowerMessage.startsWith('fix(')) {
    return { commit, type: 'fix', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('chore:') || lowerMessage.startsWith('chore(')) {
    return { commit, type: 'chore', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('docs:') || lowerMessage.startsWith('docs(')) {
    return { commit, type: 'docs', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('refactor:') || lowerMessage.startsWith('refactor(')) {
    return { commit, type: 'refactor', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('test:') || lowerMessage.startsWith('test(')) {
    return { commit, type: 'test', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('perf:') || lowerMessage.startsWith('perf(')) {
    return { commit, type: 'perf', isNoise: false, noiseReason: null };
  }
  if (lowerMessage.startsWith('style:') || lowerMessage.startsWith('style(')) {
    return { commit, type: 'style', isNoise: false, noiseReason: null };
  }

  // 13. Unknown
  return { commit, type: 'unknown', isNoise: false, noiseReason: null };
}

/**
 * Returns true if the commit only contains lockfiles or generated files.
 */
export function isLockfileOnlyCommit(commit: GitCommit, classifiedFiles: ClassifiedFile[]): boolean {
  if (classifiedFiles.length === 0) return false;
  return classifiedFiles.every(file => file.category === 'lockfile' || file.category === 'generated');
}
