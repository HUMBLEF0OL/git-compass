import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import {
  createGitParser,
  getCommitsSince,
  getAIProvider,
  generateSummary,
  type AnalysisResult,
  AIProviderType,
} from "@git-compass/core";

import { printConsoleReport } from "../formatters/console.js";
import { exportJson } from "../formatters/report-gen.js";
import { config } from "../config/index.js";
import {
  DEFAULT_BRANCH,
  DEFAULT_MAX_COMMITS,
  DEFAULT_WINDOW,
  CONFIG_KEYS,
  ENV_VARS,
} from "../constants/index.js";
import {
  getCachePath,
  loadCache,
  getCachedResult,
  updateCache,
  saveCache,
} from "../utils/cache.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { ensureGitIgnore } from "../utils/gitignore.js";
import { performFullAnalysis } from "../utils/orchestrator.js";

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

      // Find repo root to place .git-compass folder
      let repoRoot = repoPath;
      try {
        const topLevel = await git.revparse(["--show-toplevel"]);
        if (topLevel) repoRoot = path.resolve(topLevel);
      } catch (err) {
        // Fallback to repoPath if not a git repo or other error
      }

      // Ensure .git-compass is ignored
      await ensureGitIgnore(repoRoot, [".git-compass"]);

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
      const cachedResult = latestCommit ? (getCachedResult(cache, repoRoot, latestCommit) as any) : null;

      if (cachedResult) {
        if (!options.ai || (options.ai && cachedResult.aiSummary)) {
          spinner.succeed(chalk.green(`Loaded from cache for ${latestCommit.slice(0, 7)}.`));
          if (options.output) {
            await handleReportExport(cachedResult, repoPath, repoRoot, options, spinner);
          } else {
            printConsoleReport(cachedResult, options.detailLevel, !!options.ai);
          }
          return;
        }
        spinner.info(
          chalk.blue(
            `Found cached analysis for ${latestCommit.slice(0, 7)}, but AI summary is missing. Generating now...`,
          ),
        );
      }

      const commits = cachedResult
        ? [] // We won't re-fetch commits if we have a cached result and just need AI
        : await getCommitsSince(git, options.window || "30d", {
            branch: options.branch,
            maxCount: parseInt(options.maxCommits, 10),
          });

      if (!cachedResult && commits.length === 0) {
        spinner.fail(chalk.red("No commits found in the specified window/branch."));
        return;
      }

      spinner.text = `Performing deep analysis on ${commits.length} commits...`;

      let result: AnalysisResult;

      if (cachedResult) {
        result = cachedResult;
      } else {
        result = performFullAnalysis(
          commits,
          repoRoot,
          options.branch || "HEAD",
          parseInt(options.window) || 30
        );
      }

      if (options.ai) {
        spinner.text = "Generating AI insights...";

        // Resolve provider and key
        const envProvider = process.env[ENV_VARS.AI_PROVIDER] as AIProviderType;
        const configProvider = config.get(CONFIG_KEYS.AI_PROVIDER) as AIProviderType;
        const providerType = envProvider || configProvider || AIProviderType.ANTHROPIC;

        // Determine API key based on provider
        let apiKey: string | undefined;
        switch (providerType) {
          case AIProviderType.OPENAI:
            apiKey = process.env[ENV_VARS.OPENAI_API_KEY] || config.get("ai.openaiKey");
            break;
          case AIProviderType.GEMINI:
            apiKey = process.env[ENV_VARS.GEMINI_API_KEY] || config.get("ai.geminiKey");
            break;
          case AIProviderType.ANTHROPIC:
          default:
            apiKey =
              process.env[ENV_VARS.ANTHROPIC_API_KEY] ||
              config.get("ai.anthropicKey") ||
              config.get(CONFIG_KEYS.AI_KEY);
            break;
        }

        if (!apiKey) {
          spinner.warn(
            chalk.yellow(
              `AI summary requested but no API key found for ${providerType}. Skipping AI layer.`,
            ),
          );
          spinner.info(
            chalk.blue(
              `Run 'git-compass config set ai.provider <type>' to configure your preferred provider.`,
            ),
          );
        } else {
          try {
            const aiProvider = getAIProvider(providerType as any, apiKey);
            (result as any).aiSummary = await generateSummary(aiProvider, result);
          } catch (aiErr) {
            spinner.warn(chalk.yellow("AI summary failed: " + (aiErr as Error).message));
          }
        }
      }

      spinner.succeed(chalk.green(`Analysis complete for ${result.meta.commitCount} commits.`));

      // Update cache
      if (latestCommit) {
        const updatedCache = updateCache(cache, repoRoot, latestCommit, result);
        await saveCache(cachePath, updatedCache);
      }

      if (options.output) {
        await handleReportExport(result, repoPath, repoRoot, options, spinner);
      } else {
        printConsoleReport(result, options.detailLevel, !!options.ai);
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
  return `git-compass-report-${repoName}-${cleanBranch}-${timestamp}.${format}`;
}

async function handleReportExport(
  result: AnalysisResult,
  repoPath: string,
  repoRoot: string,
  options: any,
  spinner: any,
) {
  const gitCompassDirPath = path.join(repoRoot, ".git-compass");
  let finalPath = path.resolve(options.output);

  // Normalize shorthand or relative paths
  if (options.output === "json") {
    finalPath = gitCompassDirPath;
  } else if (!path.isAbsolute(options.output)) {
    finalPath = path.resolve(gitCompassDirPath, options.output);
  }

  // Ensure .git-compass directory exists
  await fs.mkdir(gitCompassDirPath, { recursive: true });

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
