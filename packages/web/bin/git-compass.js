#!/usr/bin/env node

/**
 * Git Compass CLI Wrapper
 * This script serves as the global entry point when installed via npm.
 * It resolves the target repository path based on where the user runs the command,
 * and then starts the Git Compass web dashboard server.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 1. Resolve the target directory (where the user executed the command)
const targetDir = process.cwd();

// 2. Set the REPO_PATH environment variable so server.js knows what to analyze
process.env.REPO_PATH = targetDir;

// 3. Resolve the path to the actual server.js file within the installed package
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverScriptPath = path.join(__dirname, '..', 'server.js');

// 4. Log startup message
console.log(`\x1b[36m\x1b[1m🧭 Starting Git Compass...\x1b[0m`);
console.log(`Analyzing repository at: \x1b[33m${targetDir}\x1b[0m\n`);

// 5. Execute the server script
// We use pathToFileURL to ensure compatibility with ESM imports on Windows
import(pathToFileURL(serverScriptPath).href).catch(err => {
    console.error(`\x1b[31mFailed to start Git Compass server:\x1b[0m`, err);
    process.exit(1);
});
