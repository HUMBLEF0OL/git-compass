#!usr/bin/env node
const { bold, green } = require('kleur/colors');
const { createSpinner } = require('nanospinner');

console.log(bold(green("Welcome to GitCompass!")));

// placeholder for analytics
const spinner = createSpinner('Analyzing your repository...').start();
setTimeout(() => {
    spinner.success('Analysis complete!');
}, 2000)
console.log("commandline");