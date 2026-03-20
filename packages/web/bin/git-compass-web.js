#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standalone server location
const serverPath = path.resolve(__dirname, '../.next/standalone/server.js');

/**
 * Checks if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Finds the first available port starting from basePort
 */
async function findAvailablePort(basePort) {
  let port = basePort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port++;
    if (port > basePort + 100) {
      throw new Error('Could not find an available port after 100 attempts.');
    }
  }
  return port;
}

async function startServer() {
  try {
    const basePort = parseInt(process.env.PORT || '4321', 10);
    const port = await findAvailablePort(basePort);
    
    process.env.PORT = port;
    process.env.HOSTNAME = process.env.HOSTNAME || 'localhost';
    
    // Pass the execution CWD so the API knows where to look for the repo
    process.env.GIT_COMPASS_CWD = process.cwd();

    console.log(`\x1b[32m%s\x1b[0m`, `Starting Git Compass Dashboard on http://${process.env.HOSTNAME}:${port}...`);
    console.log(`\x1b[90m%s\x1b[0m`, `Analyzing repository at: ${process.env.GIT_COMPASS_CWD}`);

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
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
