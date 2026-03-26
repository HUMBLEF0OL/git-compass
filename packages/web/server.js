import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { 
  createGitParser,
  getCommitsSince, 
  createFilterPipeline,
  computeSignalIntegrity,
  analyzeHotspots,
  analyzeVelocity,
  analyzeCommitQuality,
  analyzeContributors,
  analyzeOwnershipDrift,
  analyzeDependencyChurn,
  analyzeReviewDebt,
  analyzeOnboarding,
  analyzeRot,
  analyzeRisk,
  analyzeHealth,
  analyzeCompass
} from '../core/dist/index.js';

import { fetchBranches } from './lib/git.js';
import { MIME_TYPES } from './lib/utils.js';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const REPO_PATH = process.env.REPO_PATH || path.join(__dirname, '../../'); // Default to monorepo root

const SALT = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function encodeKey(str) {
  if (!str) return "";
  const encoded = str
    .split("")
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length)))
    .join("");
  return Buffer.from(encoded).toString("base64");
}

function decodeKey(encoded) {
  if (!encoded) return "";
  try {
    const decoded = Buffer.from(encoded, "base64").toString("binary");
    return decoded
      .split("")
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length)))
      .join("");
  } catch {
    return encoded;
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Trigger Analysis
  if (req.url === '/api/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        console.log('Received Analysis Request:', body);
        const { branch, commitsCount, excludePatterns } = JSON.parse(body);
        console.log(`Analyzing branch: ${branch}, path: ${REPO_PATH}`);
        
        // 1. Fetch Raw Commits
        const git = createGitParser(REPO_PATH);
        const rawCommits = await getCommitsSince(git, 'all', { 
          branch: branch, 
          maxCount: parseInt(commitsCount) || 500 
        });
        console.log(`Fetched ${rawCommits.length} raw commits`);

        // 2. Filter Commits
        const pipeline = createFilterPipeline({
          excludePatterns: excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : []
        });
        const filteredCommits = pipeline.filter(rawCommits);
        console.log(`Filtered to ${filteredCommits.length} commits`);

        // 3. Run Analyzers
        console.log('Running P0/P1 Analyzers...');
        const p0 = computeSignalIntegrity(rawCommits, filteredCommits);
        const hotspots = analyzeHotspots(filteredCommits);
        const velocity = analyzeVelocity(filteredCommits, 7);
        const quality = analyzeCommitQuality(filteredCommits);
        const contributors = analyzeContributors(filteredCommits);

        // 4. Run P2 Analyzers (Behavioral Insights)
        console.log('Running P2 Analyzers...');
        const activeEmails = contributors.contributors.map(c => c.email);
        
        // Ownership Drift & Transitions
        const ownership = analyzeOwnershipDrift(filteredCommits, activeEmails);
        
        // Dependency Analysis
        const dependency = analyzeDependencyChurn(filteredCommits);
        
        // Review Debt
        const review = analyzeReviewDebt(filteredCommits);

        // Risk & Health
        const risk = analyzeRisk(hotspots.hotspots);
        const health = analyzeHealth(filteredCommits);
        
        // Rot Analysis
        const rot = analyzeRot(filteredCommits);
        
        // Compass (Entry Points)
        const compass = analyzeCompass(filteredCommits);
        
        // Metrics for Onboarding
        const allFiles = [...new Set(filteredCommits.flatMap(c => c.files))];
        const churnedFiles = hotspots.hotspots.filter(h => h.changeCount > 1).length;
        const churnRate = allFiles.length > 0 ? (churnedFiles / allFiles.length) : 0;
        const totalChurn = hotspots.hotspots.reduce((acc, h) => acc + h.changeCount, 0);

        // Map per-file concentration (Silos) for frontend
        // frontend expects p2.ownership.concentration to be { [path]: score }
        // We use a simple 1/uniqueAuthors as a proxy for concentration if core doesn't provide per-file Gini yet
        const fileConcentration = {};
        hotspots.hotspots.forEach(h => {
          if (h.uniqueAuthors > 0) {
            fileConcentration[h.path] = 1 / h.uniqueAuthors;
          }
        });

        const siloCount = Object.values(fileConcentration).filter(v => v > 0.7).length;
        const siloSummary = { siloFileCount: siloCount, totalFileCount: allFiles.length };
        const rotSummary = { rotFileCount: rot.staleFiles.length, totalFileCount: allFiles.length };
        
        const churnAvg = hotspots.hotspots.length > 0 ? (totalChurn / hotspots.hotspots.length) : 0;
        const radiusAvg = hotspots.hotspots.length > 0
          ? hotspots.hotspots.reduce((acc, h) => acc + (h.uniqueAuthors || 1), 0) / hotspots.hotspots.length
          : 0;

        const onboarding = analyzeOnboarding(
          filteredCommits, 
          rotSummary, 
          siloSummary, 
          { avgBlastRadius: radiusAvg, maxBlastRadius: 0 }, 
          { avgChurnPerFile: churnAvg }
        );

        console.log('Analysis Complete');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          summary: {
            total: rawCommits.length,
            analyzed: filteredCommits.length,
            branch,
            churnRate,
            totalChurn
          },
          p0,
          p1: {
            hotspots,
            velocity,
            quality,
            contributors
          },
          p2: {
            ownership: {
              ...ownership,
              concentration: fileConcentration
            },
            dependency,
            review,
            onboarding,
            rot,
            risk,
            health,
            compass
          }
        }));
      } catch (error) {
        console.error('CRITICAL Analysis Error:', error.message);
        console.error(error.stack);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Analysis failed: ' + error.message }));
      }
    });
    return;
  }

  // Fetch Branches
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

  // Secure Settings GET
  if (req.url === '/api/settings/secure' && req.method === 'GET') {
    try {
      const envPath = path.join(REPO_PATH, '.env');
      let secureData = { llmKey: '', llmProvider: 'openai' };
      
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const keyMatch = content.match(/GIT_COMPASS_LLM_KEY=(.*)/);
        const providerMatch = content.match(/GIT_COMPASS_LLM_PROVIDER=(.*)/);
        if (keyMatch) secureData.llmKey = encodeKey(keyMatch[1].trim()); // Obfuscate for wire
        if (providerMatch) secureData.llmProvider = providerMatch[1].trim();
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(secureData));
      return;
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read secure settings' }));
      return;
    }
  }

  // Secure Settings POST
  if (req.url === '/api/settings/secure' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const llmKey = decodeKey(data.llmKey); // De-obfuscate from wire
        const llmProvider = data.llmProvider;
        const envPath = path.join(REPO_PATH, '.env');
        const gitIgnorePath = path.join(REPO_PATH, '.gitignore');

        // Write to .env
        const envContent = `GIT_COMPASS_LLM_KEY=${llmKey}\nGIT_COMPASS_LLM_PROVIDER=${llmProvider}\n`;
        fs.writeFileSync(envPath, envContent);

        // Update .gitignore
        if (fs.existsSync(gitIgnorePath)) {
          const ignoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
          if (!ignoreContent.includes('.env')) {
            fs.appendFileSync(gitIgnorePath, '\n.env\n');
          }
        } else {
          fs.writeFileSync(gitIgnorePath, '.env\n');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save secure settings' }));
      }
    });
    return;
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
