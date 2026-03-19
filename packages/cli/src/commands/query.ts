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
  queryAnalysis,
  getAIProvider,
  AIProviderType
} from "@git-compass/core";
import { config } from "../config/index.js";
import { 
  DEFAULT_BRANCH, 
  DEFAULT_MAX_COMMITS, 
  DEFAULT_WINDOW,
  CONFIG_KEYS, 
  ENV_VARS 
} from "../constants/index.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const queryCommand = new Command("query")
  .description("Ask a natural language question about the repository")
  .argument("<question>", "the question to ask")
  .option("-p, --path <path>", "path to git repository", process.cwd())
  .option("-b, --branch <branch>", "branch to analyze", DEFAULT_BRANCH)
  .option("-w, --window <window>", "time window: 7d, 30d, 90d, 1y, all", DEFAULT_WINDOW)
  .option("--max-commits <n>", "max commits to analyze", DEFAULT_MAX_COMMITS.toString())
  .option("--ai", "generate AI summary")
  .action(async (question, options) => {
    const repoPath = path.resolve(options.path);
    const spinner = ora("Setting up context...").start();

    try {
      const git = createGitParser(repoPath);
      const commits = await getCommits(git, { 
        branch: options.branch, 
        maxCount: parseInt(options.maxCommits, 10),
        since: options.window !== "all" ? options.window : undefined
      });

      if (commits.length === 0) {
        spinner.fail(chalk.red("No commits found to build context."));
        return;
      }

      spinner.text = "Analyzing repository state...";
      const result: any = {
        meta: { repoPath, branch: options.branch, commitCount: commits.length },
        hotspots: analyzeHotspots(commits),
        riskScores: computeRiskScores(analyzeHotspots(commits)),
        churn: analyzeChurn(commits),
        contributors: analyzeContributors(commits),
        burnout: analyzeBurnout(commits),
        coupling: analyzeCoupling(commits),
        knowledge: analyzeKnowledge(commits),
        impact: analyzeImpact(commits),
        rot: analyzeRot(commits)
      };

      spinner.text = "Consulting AI...";
      
      // Determine provider
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
          apiKey = process.env[ENV_VARS.ANTHROPIC_API_KEY] || config.get("ai.anthropicKey") || config.get(CONFIG_KEYS.AI_KEY);
          break;
      }

      if (!apiKey) {
        spinner.fail(chalk.red(`No API key found for ${providerType}. Use 'Git Compass config set' to configure.`));
        return;
      }

      const aiClient = getAIProvider(providerType, apiKey);
      const answer = await queryAnalysis(aiClient, question, result);

      spinner.succeed(chalk.green("AI Query Complete."));
      console.log(`\n${chalk.magenta.bold("Git Compass AI:")} ${answer}\n`);

    } catch (err) {
      spinner.fail(chalk.red("Query failed: " + (err as Error).message));
      console.error(err);
    }
  });







