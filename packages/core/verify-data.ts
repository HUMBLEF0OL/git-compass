import { createGitParser, getCommitsSince, analyzeContributors } from './src/index.js';

async function test() {
    const git = createGitParser(process.cwd() + '/../..');
    const commits = await getCommitsSince(git, '30d', { branch: 'dev' });
    console.log(`Found ${commits.length} commits`);
    
    if (commits.length > 0) {
        console.log('Sample commit insertions:', commits[0].insertions);
        const authors = analyzeContributors(commits);
        console.log('Top author data:', JSON.stringify(authors.contributors[0], null, 2));
    }
}

test().catch(console.error);
