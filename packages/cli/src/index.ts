import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { analyzeCommand } from "./commands/analyze.js";
import { analyzeAllCommand } from "./commands/analyze-all.js";
import { watchCommand } from "./commands/watch.js";
import { queryCommand } from "./commands/query.js";
import chalk from "chalk";

const program = new Command();

program
  .name("grotto")
  .description("Git repository analytics from your terminal")
  .version("0.1.0");

program.addCommand(configCommand);
program.addCommand(analyzeCommand);
program.addCommand(analyzeAllCommand);
program.addCommand(watchCommand);
program.addCommand(queryCommand);




export function run() {
  program.parse(process.argv);
}
