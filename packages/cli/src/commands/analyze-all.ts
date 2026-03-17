import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import { 
  createGitParser, 
  getCommits, 
  analyzeHotspots, 
  computeRiskScores, 
  type AnalysisResult 
} from "@git-compass/core";
import { 
  getCachePath, 
  loadCache, 
  getCachedResult, 
  updateCache, 
  saveCache 
} from "../utils/cache.js";

export const analyzeAllCommand = new Command("analyze-all")
  .description("Scan a directory for Git repositories and analyze them all")
  .argument("[path]", "directory to scan", process.cwd())
  .option("-w, --window <window>", "time window: 7d, 30d, 90d, 1y, all", "30d")
  .option("-d, --detail-level <level>", "detail level: summary, normal, verbose", "normal")
  .action(async (scanPath, options) => {
    const rootPath = path.resolve(scanPath || process.cwd());
    const spinner = ora(`Scanning for Git repositories in ${rootPath}...`).start();

    try {
      const repos = await findGitRepos(rootPath);
      
      if (repos.length === 0) {
        spinner.fail(chalk.red("No Git repositories found."));
        return;
      }

      spinner.succeed(chalk.green(`Found ${repos.length} repositories.`));
      
      const summaries: any[] = [];

      for (const repoPath of repos) {
        const repoName = path.basename(repoPath);
        const repoSpinner = ora(`Analyzing ${repoName}...`).start();
        
        try {
          const git = createGitParser(repoPath);
          const topLevel = await git.revparse(["--show-toplevel"]);
          const repoRoot = path.resolve(topLevel);
          const latestCommit = await git.revparse(["HEAD"]);
          
          const cachePath = await getCachePath(repoRoot);
          const cache = await loadCache(cachePath);
          const cachedResult = getCachedResult(cache, repoRoot, latestCommit);

          let result: AnalysisResult;

          if (cachedResult) {
            result = cachedResult;
            repoSpinner.text = `Loaded ${repoName} from cache.`;
          } else {
            const commits = await getCommits(git, { maxCount: 100 });
            const hotspots = analyzeHotspots(commits, options.window as any);
            const riskScores = computeRiskScores(hotspots);
            
            result = {
              meta: {
                repoPath: repoRoot,
                branch: "HEAD",
                window: options.window,
                commitCount: commits.length,
                generatedAt: new Date(),
              },
              hotspots,
              riskScores,
              churn: [], // Minimal for overview
              contributors: [],
              burnout: { flags: [], afterHoursCommits: 0, weekendCommits: 0, contributors: [] },
              coupling: [],
              knowledge: [],
              impact: [],
              rot: []
            };

            const updatedCache = updateCache(cache, repoRoot, latestCommit, result);
            await saveCache(cachePath, updatedCache);
          }

          const highRiskCount = result.riskScores.filter(r => r.level === "high" || r.level === "critical").length;
          
          summaries.push({
            name: repoName,
            commits: result.meta.commitCount,
            hotspots: result.hotspots.length,
            highRisk: highRiskCount
          });

          repoSpinner.succeed(chalk.cyan(`${repoName}: ${result.meta.commitCount} commits, ${highRiskCount} high-risk files.`));
        } catch (err) {
          repoSpinner.fail(chalk.red(`Failed to analyze ${repoName}: ${(err as Error).message}`));
        }
      }

      console.log("\n" + chalk.bold.underline("Organization Summary:"));
      console.table(summaries);

    } catch (err) {
      spinner.fail(chalk.red(`Scan failed: ${(err as Error).message}`));
    }
  });

async function findGitRepos(dir: string, depth = 0, maxDepth = 3): Promise<string[]> {
  const repos: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    // Check if current dir is a git repo
    if (entries.some(e => e.isDirectory() && e.name === ".git")) {
      return [dir];
    }

    if (depth >= maxDepth) return [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        const subRepos = await findGitRepos(path.join(dir, entry.name), depth + 1, maxDepth);
        repos.push(...subRepos);
      }
    }
  } catch (err) {
    // Ignore inaccessible directories
  }

  return repos;
}



