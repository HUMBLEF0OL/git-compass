#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standalone server location
const serverPath = path.resolve(__dirname, '../.next/standalone/server.js');

const port = process.env.PORT || 4321;
process.env.PORT = port;
process.env.HOSTNAME = process.env.HOSTNAME || 'localhost';

console.log(`Starting Git Compass Dashboard on http://${process.env.HOSTNAME}:${port}...`);

// Start the standalone server
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Optional: Open browser after a short delay
setTimeout(() => {
  const url = `http://${process.env.HOSTNAME}:${port}`;
  const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
  spawn(start, [url], { shell: true });
}, 2000);

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
