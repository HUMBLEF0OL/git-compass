#!usr/bin/env node
const { bold, green } = require('kleur/colors');
const { createSpinner } = require('nanospinner');
const { fetchCommitLogs, parseCommits, getFileChanges } = require('../git/gitCommands');

// console.log(bold(green("Welcome to GitCompass!")));

// // placeholder for analytics
// const spinner = createSpinner('Analyzing your repository...').start();
// setTimeout(() => {
//     spinner.success('Analysis complete!');
// }, 2000)
// console.log("commandline");

// fetchCommitLogs(1);
parseCommits();
// getFileChanges('4ad0336a6a431a92a683d6b133aef40fbd77b9c7')