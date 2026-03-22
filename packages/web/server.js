import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  createGitParser, 
  isValidRepo,
  getCommits,
  analyzeHotspots, 
  computeRiskScores, 
  analyzeChurn, 
  analyzeContributors, 
  analyzeContributorTimeline,
  analyzeBurnout,
  analyzeCoupling,
  analyzeImpact,
  analyzeRot,
  analyzeKnowledge,
  analyzeCompass,
  analyzeHealth,
  getAIProvider,
  AIProviderType,
  generateSummary,
  getBranches,
  queryAnalysis,
  maskKey,
  decodeKey
} from "@git-compass/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Simple Node.js server for Git Compass dashboard
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Routes ---

  // GET /api/branches
  if (url.pathname === '/api/branches' && req.method === 'GET') {
    try {
      const repoPath = url.searchParams.get('repoPath') || process.env.GIT_COMPASS_CWD || process.cwd();
      const parser = createGitParser(repoPath);
      const branches = await getBranches(parser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ branches }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/analyze
  if (url.pathname === '/api/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { 
          repoPath = process.env.GIT_COMPASS_CWD || process.cwd(), 
          branch = "HEAD", 
          window = "30d", 
          maxCommits = 500, 
          ai = true,
          aiProvider = "openai",
          aiApiKey = "",
          excludePatterns = []
        } = payload;

        const decodedApiKey = decodeKey(aiApiKey);

        const parser = createGitParser(repoPath);
        const isValid = await isValidRepo(parser);

        if (!isValid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Not a valid Git repository" }));
          return;
        }

        const commits = await getCommits(parser, { branch, window, maxCount: maxCommits });
        
        // Use undefined when no patterns provided so core defaults apply
        const effectivePatterns = excludePatterns && excludePatterns.length > 0 ? excludePatterns : undefined;
        
        const hotspots = analyzeHotspots(commits, window, effectivePatterns);
        const riskScores = computeRiskScores(hotspots);
        const hotspotsWithScores = hotspots.map(h => {
          const rs = riskScores.find(s => s.path === h.path);
          return { ...h, riskScore: rs?.score ?? 0, riskLevel: rs?.level ?? "low" };
        });

        const churn = analyzeChurn(commits, window, effectivePatterns);
        const contributors = analyzeContributors(commits);
        const contributorTimeline = analyzeContributorTimeline(commits);
        const burnout = analyzeBurnout(commits);
        const coupling = analyzeCoupling(commits, effectivePatterns);
        const knowledge = analyzeKnowledge(commits, effectivePatterns);
        const impact = analyzeImpact(commits, effectivePatterns);
        const rot = analyzeRot(commits, effectivePatterns);
        const compass = analyzeCompass(commits, effectivePatterns);
        const health = analyzeHealth(commits, churn, coupling);


        const analysisResult = {
          meta: { repoPath, branch, window, commitCount: commits.length, generatedAt: new Date() },
          hotspots: hotspotsWithScores,
          riskScores,
          churn,
          contributors,
          contributorTimeline,
          burnout,
          coupling,
          knowledge,
          impact,
          rot,
          compass,
          health,
        };

        let aiSummary = null;
        const finalApiKey = decodedApiKey || process.env.OPENAI_API_KEY;
        if (ai && finalApiKey) {
          try {
            const providerType = aiProvider === "anthropic" ? AIProviderType.ANTHROPIC : 
                               aiProvider === "google" ? AIProviderType.GEMINI : 
                               AIProviderType.OPENAI;
            const provider = getAIProvider(providerType, finalApiKey);
            const result = await generateSummary(provider, analysisResult);
            aiSummary = result.digest;
          } catch (e) {
            console.error(`AI summarization failed (key: ${maskKey(finalApiKey)}):`, e);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...analysisResult, aiSummary }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/query
  if (url.pathname === '/api/query' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { query, analysisContext, aiProvider = "openai", aiApiKey = "" } = JSON.parse(body);
        const decodedApiKey = decodeKey(aiApiKey);
        const finalApiKey = decodedApiKey || process.env.OPENAI_API_KEY;
        
        if (!finalApiKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "AI API Key missing" }));
          return;
        }

        const providerType = aiProvider === "anthropic" ? AIProviderType.ANTHROPIC : 
                             aiProvider === "google" ? AIProviderType.GEMINI : AIProviderType.OPENAI;
        const provider = getAIProvider(providerType, finalApiKey);
        const answer = await queryAnalysis(provider, query, analysisContext);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ answer }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- Static Files ---

  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  
  // Extension check
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
    case '.svg': contentType = 'image/svg+xml'; break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 4321;
server.listen(PORT, () => {
  console.log(`Git Compass Server running at http://localhost:${PORT}`);
});
