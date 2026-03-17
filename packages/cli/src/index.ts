import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { analyzeCommand } from "./commands/analyze.js";
import { analyzeAllCommand } from "./commands/analyze-all.js";
import { watchCommand } from "./commands/watch.js";
import { queryCommand } from "./commands/query.js";
import chalk from "chalk";

const program = new Command();

program
  .name("git-compass")
  .description("Git repository analytics from your terminal")
  .version("0.1.0");

program.addCommand(configCommand);
program.addCommand(analyzeCommand);
program.addCommand(analyzeAllCommand);
program.addCommand(watchCommand);
program.addCommand(queryCommand);

// Handle unknown commands gracefully
program.on("command:*", (cmds) => {
  const unknownCommand = cmds[0];
  const availableCommands = program.commands.map(cmd => cmd.name());
  
  console.error(
    `\n${chalk.red.bold("Error:")} Unknown command ${chalk.yellow(unknownCommand)}`
  );

  // Simple "did you mean" logic
  const suggestion = availableCommands.find(c => {
    // Basic prefix or substring match for simplicity
    return c.startsWith(unknownCommand.slice(0, 3)) || unknownCommand.includes(c);
  });

  if (suggestion) {
    console.log(`Did you mean ${chalk.green(suggestion)}?`);
  }

  console.log(`Run ${chalk.cyan("git-compass --help")} to see all available commands.\n`);
  process.exit(1);
});

export function run() {
  try {
    program.parse(process.argv);
    
    // Show help if no arguments provided
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
  } catch (err) {
    console.error(`\n${chalk.red.bold("Fatal Error:")} ${(err as Error).message}`);
    process.exit(1);
  }
}



