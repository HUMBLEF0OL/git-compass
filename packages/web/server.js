import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { fetchBranches } from './lib/git.js';
import { MIME_TYPES } from './lib/utils.js';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const REPO_PATH = process.env.REPO_PATH || path.join(__dirname, '../../'); // Default to monorepo root

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.url === '/api/branches') {
    try {
      const branches = await fetchBranches(REPO_PATH);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(branches));
      return;
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch branches' }));
      return;
    }
  }

  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
