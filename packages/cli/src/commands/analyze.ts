import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { 
  createGitParser, 
  getCommits, 
  analyzeHotspots, 
  computeRiskScores, 
  analyzeChurn, 
  analyzeContributors, 
  analyzeBurnout, 
  analyzeCoupling, 
  analyzeKnowledge, 
  analyzeImpact, 
  analyzeRot, 
  createAIClient, 
  generateSummary, 
  type AnalysisResult 
} from "@grotto/core";

import { printConsoleReport } from "../formatters/console.js";
import { exportJson } from "../formatters/report-gen.js";
import { config } from "../config/index.js";
import { 
  DEFAULT_BRANCH, 
  DEFAULT_MAX_COMMITS, 
  DEFAULT_WINDOW, 
  CONFIG_KEYS, 
  ENV_VARS 
} from "../constants/index.js";
import { 
  getCachePath, 
  loadCache, 
  getCachedResult, 
  updateCache, 
  saveCache 
} from "../utils/cache.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config();

export const analyzeCommand = new Command("analyze")
  .description("Analyze a Git repository and surface insights")
  .option("-p, --path <path>", "path to git repository", process.cwd())
  .option("-b, --branch <branch>", "branch to analyze", DEFAULT_BRANCH)
  .option("-w, --window <window>", `time window: 7d, 30d, 90d, 1y, all`, DEFAULT_WINDOW)
  .option("--max-commits <n>", "max commits to analyze", DEFAULT_MAX_COMMITS.toString())
  .option("-o, --output <path>", "path to save report (directory or filename)")
  .option("-d, --detail-level <level>", "detail level: summary, normal, verbose", "normal")
  .option("--ai", "generate AI summary (requires API key)")
  .action(async (options) => {
    const repoPath = path.resolve(options.path);
    const spinner = ora("Initializing analysis...").start();

    try {
      const git = createGitParser(repoPath);
      
      // Find repo root to place .grotto folder
      let repoRoot = repoPath;
      try {
        const topLevel = await git.revparse(["--show-toplevel"]);
        if (topLevel) repoRoot = path.resolve(topLevel);
      } catch (err) {
        // Fallback to repoPath if not a git repo or other error
      }

      spinner.text = `Fetching commits from ${options.branch}...`;
      
      // Get latest commit hash for caching
      let latestCommit = "";
      try {
        latestCommit = await git.revparse([options.branch || "HEAD"]);
      } catch (err) {
        // Fallback if branch is invalid or other error
      }

      // Check cache
      const cachePath = await getCachePath(repoRoot);
      const cache = await loadCache(cachePath);
      const cachedResult = latestCommit ? getCachedResult(cache, repoRoot, latestCommit) : null;

      if (cachedResult) {
        spinner.succeed(chalk.green(`Loaded from cache for ${latestCommit.slice(0, 7)}.`));
        if (options.output) {
          // Proceed to save output if requested
          await handleReportExport(cachedResult, repoPath, repoRoot, options, spinner);
        } else {
          printConsoleReport(cachedResult, options.detailLevel);
        }
        return;
      }

      const commits = await getCommits(git, { 
        branch: options.branch, 
        maxCount: parseInt(options.maxCommits, 10) 
      });

      if (commits.length === 0) {
        spinner.fail(chalk.red("No commits found in the specified window/branch."));
        return;
      }

      spinner.text = `Analyzing ${commits.length} commits...`;

      const hotspots = analyzeHotspots(commits, options.window as any);
      const riskScores = computeRiskScores(hotspots);
      const churn = analyzeChurn(commits, options.window as any);
      const contributors = analyzeContributors(commits);
      const burnout = analyzeBurnout(commits);
      const coupling = analyzeCoupling(commits);
      const knowledge = analyzeKnowledge(commits);
      const impact = analyzeImpact(commits);
      const rot = analyzeRot(commits);

      const result: AnalysisResult = {
        meta: {
          repoPath,
          branch: options.branch,
          window: options.window,
          commitCount: commits.length,
          generatedAt: new Date(),
        },
        hotspots,
        riskScores,
        churn,
        contributors,
        burnout,
        coupling,
        knowledge,
        impact,
        rot
      };

      if (options.ai) {
        spinner.text = "Generating AI insights...";
        const apiKey = process.env[ENV_VARS.ANTHROPIC_API_KEY] || (config.get(CONFIG_KEYS.AI_KEY) as string);
        
        if (!apiKey) {
          spinner.warn(chalk.yellow("AI summary requested but no API key found. Skipping AI layer."));
        } else {
          try {
            const aiClient = createAIClient(apiKey);
            result.aiSummary = await generateSummary(aiClient, result);
          } catch (aiErr) {
            spinner.warn(chalk.yellow("AI summary failed: " + (aiErr as Error).message));
          }
        }
      }

      spinner.succeed(chalk.green(`Analysis complete for ${commits.length} commits.`));
      
      // Update cache
      if (latestCommit) {
        const updatedCache = updateCache(cache, repoRoot, latestCommit, result);
        await saveCache(cachePath, updatedCache);
      }

      if (options.output) {
        await handleReportExport(result, repoPath, repoRoot, options, spinner);
      } else {
        printConsoleReport(result, options.detailLevel);
      }

    } catch (err) {
      spinner.fail(chalk.red("Analysis failed: " + (err as Error).message));
      console.error(err);
    }
  });

function generateReportFilename(repoPath: string, branch: string, format: string): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const cleanBranch = branch.replace(/[/\\?%*:|"<>]/g, "-");
  return `grotto-report-${repoName}-${cleanBranch}-${timestamp}.${format}`;
}

async function handleReportExport(
  result: AnalysisResult, 
  repoPath: string, 
  repoRoot: string, 
  options: any, 
  spinner: any
) {
  const grottoDirPath = path.join(repoRoot, ".grotto");
  let finalPath = path.resolve(options.output);

  // Normalize shorthand or relative paths
  if (options.output === "json") {
    finalPath = grottoDirPath;
  } else if (!path.isAbsolute(options.output)) {
    finalPath = path.resolve(grottoDirPath, options.output);
  }
  
  // Ensure .grotto directory exists
  await fs.mkdir(grottoDirPath, { recursive: true });

  // Handle directory vs file logic
  try {
    if (!path.extname(finalPath)) {
      await fs.mkdir(finalPath, { recursive: true });
      finalPath = path.join(finalPath, generateReportFilename(repoPath, options.branch, "json"));
    } else {
      await fs.mkdir(path.dirname(finalPath), { recursive: true });
    }
  } catch (err) {
     spinner.fail(chalk.red("Failed to prepare output directory: " + (err as Error).message));
     return;
  }

  spinner.start(`Exporting report...`);
  try {
    const outPath = await exportJson(result, finalPath);
    spinner.succeed(chalk.green(`Report saved to ${outPath}`));
  } catch (err) {
    spinner.fail(chalk.red("Export failed: " + (err as Error).message));
  }
}
