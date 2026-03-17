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
    config.set(key, value);
    console.log(chalk.green(`${key} set successfully.`));
  });

configCommand
  .command("set-ai")
  .description("Interactively configure AI provider and API key")
  .action(async () => {
    const { select, password } = await import("@inquirer/prompts");
    
    const provider = await select({
      message: "Select an AI provider:",
      choices: [
        { name: "Anthropic (Claude)", value: "anthropic" },
        { name: "OpenAI (GPT-4o)", value: "openai" },
        { name: "Google Gemini (1.5 Pro)", value: "gemini" }
      ]
    });

    const apiKey = await password({
      message: `Enter your ${provider} API Key:`,
      mask: "*"
    });

    if (apiKey) {
      config.set("ai.provider", provider);
      config.set(`ai.${provider}Key`, apiKey);
      // Also set the main ai.key for backward compatibility/simplicity
      config.set("ai.key", apiKey);
      console.log(chalk.green(`\nAI configured successfully with ${provider}!`));
    }
  });

configCommand
  .command("get <key>")
  .description("Get a configuration value")
  .action((key) => {
    const value = config.get(key);
    if (key.toLowerCase().includes("key") && value) {
      console.log(`${key}: ${maskKey(value as string)}`);
    } else {
      console.log(`${key}: ${value ?? "not set"}`);
    }
  });

configCommand
  .command("list")
  .description("List all configuration")
  .action(() => {
    const all = config.store as any;
    console.log(chalk.blue.bold(`\n--- ${PROJECT_NAME} Configuration ---`));
    
    if (all.ai) {
      console.log(`${chalk.yellow("AI Provider:")} ${all.ai.provider || "not set"}`);
      if (all.ai.anthropicKey) console.log(`${chalk.yellow("Anthropic Key:")} ${maskKey(all.ai.anthropicKey)}`);
      if (all.ai.openaiKey) console.log(`${chalk.yellow("OpenAI Key:")} ${maskKey(all.ai.openaiKey)}`);
      if (all.ai.geminiKey) console.log(`${chalk.yellow("Gemini Key:")} ${maskKey(all.ai.geminiKey)}`);
    }

    // List other top-level keys if any
    for (const [key, val] of Object.entries(all)) {
      if (key !== "ai") {
        console.log(`${key}: ${JSON.stringify(val)}`);
      }
    }
  });

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
