import { createGitParser, getBranches } from '../../core/dist/index.js';

export async function fetchBranches(repoPath) {
    try {
        const git = createGitParser(repoPath);
        return await getBranches(git);
    } catch (error) {
        throw new Error(`Failed to fetch branches from @git-compass/core: ${error.message}`);
    }
}
