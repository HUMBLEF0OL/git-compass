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
  analyzeCompass,
  getAIProvider,
  generateSummary,
  queryAnalysis,
  summarizeWithTemplate,
  generateInsightPack,
  createIncrementalContext,
  serializeSnapshot,
  deserializeSnapshot,
  compareSnapshots
} from '../core/dist/index.js';

import { fetchBranches } from './lib/git.js';
import { MIME_TYPES } from './lib/utils.js';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
// Dynamically resolve to the directory where the user executes the 'git-compass' command
const REPO_PATH = process.env.REPO_PATH || process.cwd(); 

const SNAPSHOTS_DIR = path.join(REPO_PATH, '.git-compass', 'snapshots');

// Helper to get directory for a branch's snapshots
const getSnapshotDir = (branch) => {
  const safeBranchName = branch.replace(/[^a-zA-Z0-9-]/g, '_');
  return path.join(SNAPSHOTS_DIR, safeBranchName);
};

// Helper to get the latest snapshot file path
const getLatestSnapshotPath = (branch) => {
  const dir = getSnapshotDir(branch);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  return files.length > 0 ? path.join(dir, files[files.length - 1]) : null;
};

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
        const { branch, commitsCount, excludePatterns, createSnapshot, windowDays } = JSON.parse(body);
        console.log(`Analyzing branch: ${branch}, path: ${REPO_PATH}`);
        
        let storedBaseline = null;
        let storedAnalysis = null;
        const latestSnapshotPath = getLatestSnapshotPath(branch);
        
        if (latestSnapshotPath && fs.existsSync(latestSnapshotPath)) {
          try {
            const raw = fs.readFileSync(latestSnapshotPath, 'utf8');
            const envelope = deserializeSnapshot(raw, { skipChecksumValidation: true });
            storedBaseline = envelope.baseline;
            storedAnalysis = envelope.analysis;
            console.log(`[Incremental] Found stored snapshot for branch '${branch}' at ${path.basename(latestSnapshotPath)}`);
          } catch (e) {
            console.warn(`[Incremental] Failed to read snapshot: ${e.message}`);
          }
        }

        const git = createGitParser(REPO_PATH);
        const rawCommits = await getCommitsSince(git, 'all', { 
          branch: branch, 
          maxCount: parseInt(commitsCount) || 500 
        });
        console.log(`Fetched ${rawCommits.length} raw commits`);

        const excludeArr = excludePatterns 
          ? excludePatterns
              .split(/[\n,]+/)
              .map(p => p.trim().replace(/^['"`]+|['"`]+$/g, ''))
              .filter(p => p.length > 0)
          : [];
        const ctx = createIncrementalContext(rawCommits, { 
          baseline: storedBaseline, 
          windowDays: windowDays || 30,
          filterOptions: { excludePatterns: excludeArr }
        });
        
        console.log(`Filtered to ${ctx.mergedCommits.length} commits. hasNewData=${ctx.hasNewData}`);
        
        if (!ctx.hasNewData && storedAnalysis) {
          console.log(`[Incremental] No new commits detected. Serving cached analysis.`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(storedAnalysis));
          return;
        }

        const filteredCommits = ctx.mergedCommits;
        
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
        const review = analyzeReviewDebt(rawCommits);

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

        const finalAnalysis = {
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
        };

        const snapshotPayload = {
          baseline: ctx.updatedBaseline,
          analysis: finalAnalysis
        };
        
        if (createSnapshot) {
          try {
            const dir = getSnapshotDir(branch);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newPath = path.join(dir, `snapshot_${timestamp}.json`);
            
            const serialized = serializeSnapshot(snapshotPayload);
            fs.writeFileSync(newPath, serialized, 'utf8');
            console.log(`[Incremental] Saved new snapshot to ${newPath}`);
          } catch (e) {
            console.error(`[Incremental] Failed to save snapshot: ${e.message}`);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(finalAnalysis));
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

  // List History Snapshots
  if (req.url === '/api/snapshots' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { branch } = JSON.parse(body);
        const dir = getSnapshotDir(branch);
        if (!fs.existsSync(dir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify([]));
        }
        
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
        const snapshots = files.map(file => {
          const raw = fs.readFileSync(path.join(dir, file), 'utf8');
          const envelope = JSON.parse(raw);
          const payload = JSON.parse(envelope.payload);
          return {
            id: file,
            computedAt: payload.baseline.computedAt,
            headCommitHash: payload.baseline.headCommitHash,
            metrics: {
              totalChurn: payload.analysis.summary?.totalChurn || 0,
              churnRate: payload.analysis.summary?.churnRate || 0,
              commits: payload.analysis.summary?.analyzed || 0
            }
          };
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(snapshots));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Compare Snapshots AI
  if (req.url === '/api/ai/compare' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { branch, baseSnapshotId } = JSON.parse(body);
        const dir = getSnapshotDir(branch);
        
        if (!fs.existsSync(dir) || !baseSnapshotId) {
          throw new Error('Missing snapshot directory or base ID');
        }
        
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
        if (files.length < 2) {
          throw new Error('Not enough snapshots to compare');
        }
        
        const latestFile = files[files.length - 1];
        const baseFile = files.find(f => f === baseSnapshotId) || files[0];
        
        if (baseFile === latestFile) throw new Error('Cannot compare identical snapshots');

        const { provider, key } = await getSecureLLMConfig();
        if (!key) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'LLM Key not configured for AI comparison.' }));
        }

        const rawA = fs.readFileSync(path.join(dir, baseFile), 'utf8');
        const rawB = fs.readFileSync(path.join(dir, latestFile), 'utf8');
        
        const envA = deserializeSnapshot(rawA, { skipChecksumValidation: true });
        const envB = deserializeSnapshot(rawB, { skipChecksumValidation: true });
        
        const extractMetrics = (analysis, ts) => ({
          capturedAt: ts,
          windowDays: analysis.meta?.windowDays || 30,
          metrics: {
             totalCommits: analysis.summary?.analyzed || 0,
             totalChurn: analysis.summary?.totalChurn || 0,
             churnRate: analysis.summary?.churnRate || 0,
             siloCount: Object.values(analysis.p2?.ownership?.concentration || {}).filter(v => v > 0.7).length,
             staleFilesCount: analysis.p2?.rot?.staleFiles?.length || 0,
             riskScoreAvg: analysis.risk?.fileRisks?.length ? analysis.risk.fileRisks.reduce((a, r) => a + r.score, 0) / analysis.risk.fileRisks.length : 0
          }
        });
        
        const snapA = extractMetrics(envA.analysis, envA.baseline.computedAt);
        const snapB = extractMetrics(envB.analysis, envB.baseline.computedAt);
        
        const ai = getAIProvider(provider, key);
        const delta = await compareSnapshots(snapA, snapB, { provider: ai });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(delta));
      } catch (error) {
        console.error("Compare Error:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
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

  // AI Insights Generation
  if (req.url === '/api/ai/insights' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { branch } = JSON.parse(body);
        const { provider, key } = await getSecureLLMConfig();
        
        if (!key) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'LLM Key not configured. Please add it in Settings.' }));
          return;
        }
        
        const latestPath = getLatestSnapshotPath(branch);
        if (!latestPath) throw new Error('Analysis must be run before insights can be generated.');
        const raw = fs.readFileSync(latestPath, 'utf8');
        const analysis = deserializeSnapshot(raw, { skipChecksumValidation: true }).analysis;

        const aiPayload = {
          meta: { repoPath: REPO_PATH, branch: branch, commitCount: analysis.summary?.analyzed || 0, windowDays: 30 },
          hotspots: analysis.p1?.hotspots || { hotspots: [] },
          risk: analysis.p2?.risk || { averageScore: 0, fileRisks: [] },
          health: analysis.p2?.health || { stability: 0, velocity: 0, simplicity: 0, coverage: 0 },
          compass: analysis.p2?.compass || { entryPoints: [] }
        };

        const ai = getAIProvider(provider, key);
        const insightPack = await generateInsightPack(aiPayload, { provider: ai });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(insightPack));
      } catch (error) {
        console.error('AI Insights Error:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // AI Narrative Summary
  if (req.url === '/api/ai/summarize' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { branch, template = 'executive' } = JSON.parse(body);
        const { provider, key } = await getSecureLLMConfig();
        
        if (!key) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'LLM Key not configured. AI narrative summary is disabled.' }));
          return;
        }
        
        const latestPath = getLatestSnapshotPath(branch);
        if (!latestPath) throw new Error('Analysis must be run before summaries can be generated.');
        const raw = fs.readFileSync(latestPath, 'utf8');
        const analysis = deserializeSnapshot(raw, { skipChecksumValidation: true }).analysis;
        
        const aiPayload = {
          meta: { repoPath: REPO_PATH, branch: branch, commitCount: analysis.summary?.analyzed || 0, windowDays: 30 },
          hotspots: analysis.p1?.hotspots || { hotspots: [] },
          risk: analysis.p2?.risk || { averageScore: 0, fileRisks: [] },
          health: analysis.p2?.health || { stability: 0, velocity: 0, simplicity: 0, coverage: 0 },
          compass: analysis.p2?.compass || { entryPoints: [] }
        };

        const ai = getAIProvider(provider, key);
        const summary = await summarizeWithTemplate(ai, aiPayload, { audience: template });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ summary }));
      } catch (error) {
        console.error('AI Summary Error:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // AI Interactive Query
  if (req.url === '/api/ai/query' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { branch, query } = JSON.parse(body);
        const { provider, key } = await getSecureLLMConfig();
        
        if (!key) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response: 'LLM Key not configured. Please add it in Settings to enable interactive queries.' }));
          return;
        }
        
        const latestPath = getLatestSnapshotPath(branch);
        if (!latestPath) throw new Error('Analysis must be run before querying the repo state.');
        const raw = fs.readFileSync(latestPath, 'utf8');
        const analysis = deserializeSnapshot(raw, { skipChecksumValidation: true }).analysis;
        
        const aiPayload = {
          meta: { repoPath: REPO_PATH, branch: branch, commitCount: analysis.summary?.analyzed || 0, windowDays: 30 },
          hotspots: analysis.p1?.hotspots || { hotspots: [] },
          risk: analysis.p2?.risk || { averageScore: 0, fileRisks: [] },
          health: analysis.p2?.health || { stability: 0, velocity: 0, simplicity: 0, coverage: 0 },
          compass: analysis.p2?.compass || { entryPoints: [] }
        };

        const ai = getAIProvider(provider, key);
        const response = await queryAnalysis(ai, aiPayload, query);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response }));
      } catch (error) {
        console.error('AI Query Error:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // --- ACTIVITY HISTORY API ---
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (parsedUrl.pathname === '/api/history' && req.method === 'GET') {
    const branch = parsedUrl.searchParams.get('branch') || 'all';
    
    try {
      console.log(`Fetching 1-year history for branch: ${branch}`);
      const git = createGitParser(REPO_PATH);
      
      const args = ['--since=365 days ago', '--format=%ad', '--date=iso'];
      if (branch !== 'all') {
          args.push(branch);
      }
      
      const rawLog = await git.raw(['log', ...args]);
      const commitDates = rawLog.split('\n').filter(Boolean);
      
      const historyMap = {};
      commitDates.forEach(dateStr => {
          const date = dateStr.split(' ')[0]; // Extract YYYY-MM-DD
          historyMap[date] = (historyMap[date] || 0) + 1;
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(historyMap));
    } catch (err) {
      console.error('History API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Helper: Retrieve secure config
  async function getSecureLLMConfig() {
    const envPath = path.join(REPO_PATH, '.env');
    if (!fs.existsSync(envPath)) return { provider: 'openai', key: null };
    const content = fs.readFileSync(envPath, 'utf8');
    const keyMatch = content.match(/GIT_COMPASS_LLM_KEY=(.*)/);
    const providerMatch = content.match(/GIT_COMPASS_LLM_PROVIDER=(.*)/);
    return {
      key: keyMatch ? keyMatch[1].trim() : null,
      provider: providerMatch ? providerMatch[1].trim() : 'openai'
    };
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
