import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import * as dotenv from "dotenv";
import fs from "fs/promises";
import {
  createGitParser,
  getCommitsSince,
  getAIProvider,
  generateSummary,
  type AnalysisResult,
  AIProviderType,
} from "@git-compass/core";
import { config } from "../config/index.js";
import { CONFIG_KEYS, ENV_VARS } from "../constants/index.js";
import {
  getCachePath,
  loadCache,
  getCachedResult,
  updateCache,
  saveCache,
} from "../utils/cache.js";
import { ensureGitIgnore } from "../utils/gitignore.js";
import { printConsoleReport } from "../formatters/console.js";
import { performFullAnalysis } from "../utils/orchestrator.js";


export const analyzeAllCommand = new Command("analyze-all")
  .description("Scan a directory for Git repositories and analyze them all")
  .argument("[path]", "directory to scan", process.cwd())
  .option("-w, --window <window>", "time window: 7d, 30d, 90d, 1y, all", "30d")
  .option("--max-commits <n>", "max commits to analyze per repo", "100")
  .option("-d, --detail-level <level>", "detail level: summary, normal, verbose", "normal")
  .option("--ai", "generate AI summaries (requires API key)")
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

          // Ensure .git-compass is ignored
          await ensureGitIgnore(repoRoot, [".git-compass"]);

          const cachePath = await getCachePath(repoRoot);
          const cache = await loadCache(cachePath);
          const cachedResult = getCachedResult(cache, repoRoot, latestCommit);

          let result: AnalysisResult;

          if (cachedResult && (!options.ai || (cachedResult as any).aiSummary)) {
            result = cachedResult as any;
            repoSpinner.text = `Loaded ${repoName} from cache.`;
          } else {
            const commits = await getCommitsSince(git, options.window || "30d", {
              maxCount: parseInt(options.maxCommits, 10),
              branch: "HEAD",
            });
            
            result = performFullAnalysis(
              commits,
              repoRoot,
              "HEAD",
              parseInt(options.window) || 30
            );

            if (options.ai) {
              const envProvider = process.env[ENV_VARS.AI_PROVIDER] as AIProviderType;
              const configProvider = config.get(CONFIG_KEYS.AI_PROVIDER) as AIProviderType;
              const providerType = envProvider || configProvider || AIProviderType.ANTHROPIC;

              let apiKey: string | undefined;
              if (providerType === "openai")
                apiKey = process.env[ENV_VARS.OPENAI_API_KEY] || config.get("ai.openaiKey");
              else if (providerType === "gemini")
                apiKey = process.env[ENV_VARS.GEMINI_API_KEY] || config.get("ai.geminiKey");
              else
                apiKey =
                  process.env[ENV_VARS.ANTHROPIC_API_KEY] ||
                  config.get("ai.anthropicKey") ||
                  config.get(CONFIG_KEYS.AI_KEY);

              if (apiKey) {
                try {
                  const aiProvider = getAIProvider(providerType, apiKey);
                  (result as any).aiSummary = await generateSummary(aiProvider, result);
                } catch (e) {}
              }
            }

            const updatedCache = updateCache(cache, repoRoot, latestCommit, result);
            await saveCache(cachePath, updatedCache);
          }

          const highRiskCount = result.risk.fileRisks.filter(
            (r) => r.level === "high" || r.level === "critical",
          ).length;

          summaries.push({
            name: repoName,
            commits: result.meta.commitCount,
            hotspots: result.hotspots.hotspots.length,
            highRisk: highRiskCount,
          });

          repoSpinner.succeed(
            chalk.cyan(
              `${repoName}: ${result.meta.commitCount} commits, ${highRiskCount} high-risk files.`,
            ),
          );

          if (options.detailLevel === "verbose") {
            printConsoleReport(result, "normal", !!options.ai);
          }
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
    if (entries.some((e) => e.isDirectory() && e.name === ".git")) {
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
