const kleur = require('kleur');
const { createSpinner } = require('nanospinner');
const simpleGit = require('simple-git');
const logger = require('../utils/logger');

const git = simpleGit();

const fetchCommitLogs = async (limit = null) => {
    try {
        let logs;
        if (Number.isInteger(limit) && limit > 0) {
            logs = await git.log({ maxCount: limit });
        } else {
            logs = await git.log();
        }
        console.log(logs);
    } catch (err) {
        console.error('Error fetching commit logs:', err.message);
    }
}

const parseCommits = async () => {
    logger.startSpinner('Fetching git logs...');

    try {
        const logs = await git.log();
        logger.spinnerSuccess('Successfully fetched git logs!');

        logger.section('📋 COMMIT HISTORY');

        logs.all.forEach((commit, index) => {
            logger.info(`Commit #${index + 1}`);
            logger.info(`Author: ${commit.author_name}`);
            logger.info(`Date:   ${new Date(commit.date).toLocaleString()}`);
            logger.info(`Hash:   ${commit.hash.substring(0, 7)}`);
            logger.info(`Message: ${commit.message}`);
            logger.divider();
        });

        logger.success(`✨ Total commits: ${logs.all.length}`);
    } catch (err) {
        logger.spinnerError('Error fetching git logs!');
        logger.error(err.message);
    }
}

const getFileChanges = async (commitHash) => {
    try {
        const diff = await git.show([commitHash, '--stat']);
        // console.log(diff)
        console.log(parseFileChanges(diff));
    } catch (err) {
        console.error('Error fetching file changes: ', err.message);
    }
}

const parseFileChanges = (diffSummary) => {
    const lines = diffSummary.split('\n');
    const changes = lines
        .filter((line) => line.includes('|'))
        .map((line) => {
            const [file, stats] = line.split('|');
            return {
                file: file.trim(),
                stats: stats.trim(),
            };
        });
    return changes;
}

module.exports = {
    git,
    fetchCommitLogs,
    parseCommits,
    getFileChanges
}