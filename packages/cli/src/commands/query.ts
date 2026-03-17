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
  queryAnalysis
} from "@grotto/core";
import { config } from "../config/index.js";
import { 
  DEFAULT_BRANCH, 
  DEFAULT_MAX_COMMITS, 
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
  .action(async (question, options) => {
    const repoPath = path.resolve(options.path);
    const spinner = ora("Setting up context...").start();

    try {
      const git = createGitParser(repoPath);
      const commits = await getCommits(git, { branch: options.branch, maxCount: DEFAULT_MAX_COMMITS });

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
      const apiKey = process.env[ENV_VARS.ANTHROPIC_API_KEY] || (config.get(CONFIG_KEYS.AI_KEY) as string);
      
      if (!apiKey) {
        spinner.fail(chalk.red(`No API key found. Use 'grotto config set ${CONFIG_KEYS.AI_KEY} <key>' to configure.`));
        return;
      }

      const aiClient = createAIClient(apiKey);
      const answer = await queryAnalysis(aiClient, question, result);

      spinner.succeed(chalk.green("AI Query Complete."));
      console.log(`\n${chalk.magenta.bold("Grotto AI:")} ${answer}\n`);

    } catch (err) {
      spinner.fail(chalk.red("Query failed: " + (err as Error).message));
      console.error(err);
    }
  });
