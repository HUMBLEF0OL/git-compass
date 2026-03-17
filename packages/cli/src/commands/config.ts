import { Command } from "commander";
import chalk from "chalk";
import { config } from "../config/index.js";
import { CONFIG_KEYS, PROJECT_NAME } from "../constants/index.js";

export const configCommand = new Command("config")
  .description(`Manage ${PROJECT_NAME} configuration`);

configCommand
  .command("set <key> <value>")
  .description("Set a configuration value (e.g., ai.key)")
  .action((key, value) => {
    if (key === CONFIG_KEYS.AI_KEY) {
      config.set(CONFIG_KEYS.AI_KEY, value);
      console.log(chalk.green("API Key stored securely in global config."));
    } else {
      config.set(key, value);
      console.log(chalk.green(`${key} set to ${value}`));
    }
  });

configCommand
  .command("get <key>")
  .description("Get a configuration value")
  .action((key) => {
    const value = config.get(key);
    if (key === CONFIG_KEYS.AI_KEY && value) {
      console.log(`${key}: ${maskKey(value as string)}`);
    } else {
      console.log(`${key}: ${value ?? "not set"}`);
    }
  });

configCommand
  .command("list")
  .description("List all configuration")
  .action(() => {
    const all = config.store;
    console.log(chalk.blue.bold(`\n--- ${PROJECT_NAME} Configuration ---`));
    for (const [key, val] of Object.entries(all || {})) {
      if (key === "ai" && typeof val === "object" && val !== null && "key" in val) {
        console.log(`${CONFIG_KEYS.AI_KEY}: ${maskKey((val as any).key as string)}`);
      } else {
        console.log(`${key}: ${JSON.stringify(val)}`);
      }
    }
  });

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
