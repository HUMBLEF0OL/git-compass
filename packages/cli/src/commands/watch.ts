import { Command } from "commander";
import chokidar from "chokidar";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { DEFAULT_BRANCH, PROJECT_NAME } from "../constants/index.js";

export const watchCommand = new Command("watch")
  .description(`Watch for repository changes and re-run analysis`)
  .option("-p, --path <path>", "path to git repository", process.cwd())
  .option("-b, --branch <branch>", "branch to analyze", DEFAULT_BRANCH)
  .option("-w, --window <window>", "time window: 7d, 30d, 90d, 1y, all", "30d")
  .option("--max-commits <n>", "max commits to analyze", "500")
  .option("--ai", "generate AI summary")
  .action((options) => {
    const repoPath = path.resolve(options.path);
    const gitDir = path.join(repoPath, ".git");

    console.log(chalk.cyan.bold(`\n${PROJECT_NAME} is watching ${repoPath}...`));
    console.log(chalk.gray("Analysis will re-run on every commit.\n"));

    // Initial run
    runAnalysis(options);

    const watcher = chokidar.watch([
      path.join(gitDir, "refs", "heads"),
      path.join(gitDir, "index")
    ], {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on("change", (filePath) => {
      console.log(chalk.yellow(`\nChange detected in ${path.basename(filePath)}. Re-analyzing...`));
      runAnalysis(options);
    });

    process.on("SIGINT", () => {
      watcher.close();
      process.exit(0);
    });
  });

function runAnalysis(options: any) {
  try {
    const binPath = path.join(process.cwd(), "dist/bin/git-compass.js");
    let cmd = `node ${binPath} analyze -p "${options.path}" -b "${options.branch}" -w "${options.window}" --max-commits ${options.maxCommits}`;
    if (options.ai) cmd += " --ai";
    
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(chalk.red("Watch analysis failed. check your git state."));
  }
}







