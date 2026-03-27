import { createGitParser } from './src/parser/git-parser.js';

async function inspect() {
    const git = createGitParser(process.cwd());
    const log = await git.log(['-n', '1', '--stat']);
    const commit = log.all[0];
    console.log('Commit hash:', commit.hash);
    console.log('Diff info:', JSON.stringify(commit.diff, null, 2));
}

inspect().catch(console.error);
