import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const CONFIG_MAP: Record<string, string> = {
  "ai.provider": "GIT_COMPASS_AI_PROVIDER",
  "ai.key": "GIT_COMPASS_AI_KEY",
  "ai.anthropicKey": "ANTHROPIC_API_KEY",
  "ai.openaiKey": "OPENAI_API_KEY",
  "ai.geminiKey": "GEMINI_API_KEY",
};

function findGitRoot(startDir: string): string {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

class EnvConfig {
  private envPath: string;

  constructor() {
    const root = findGitRoot(process.cwd());
    this.envPath = path.resolve(root, ".env");
  }

  get(key: string): string | undefined {
    // Reload env to get latest values
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath);
      const envConfig = dotenv.parse(envContent);
      const envKey = CONFIG_MAP[key] || key;
      return envConfig[envKey];
    }
    return process.env[CONFIG_MAP[key] || key];
  }

  set(key: string, value: string): void {
    const envKey = CONFIG_MAP[key] || key;
    let content = "";

    if (fs.existsSync(this.envPath)) {
      content = fs.readFileSync(this.envPath, "utf-8");
    }

    const lines = content.split("\n");
    let found = false;

    const newLines = lines.map((line) => {
      if (line.trim().startsWith(`${envKey}=`)) {
        found = true;
        return `${envKey}=${value}`;
      }
      return line;
    });

    if (!found) {
      newLines.push(`${envKey}=${value}`);
    }

    fs.writeFileSync(this.envPath, newLines.join("\n").trim() + "\n", "utf-8");

    // Update process.env for current session
    process.env[envKey] = value;
  }

  get store(): Record<string, any> {
    if (fs.existsSync(this.envPath)) {
      const data = dotenv.parse(fs.readFileSync(this.envPath, "utf-8"));
      const result: any = { ai: {} };

      // Map back to schema for compatibility
      for (const [configKey, envKey] of Object.entries(CONFIG_MAP)) {
        if (data[envKey]) {
          const parts = configKey.split(".");
          if (parts.length === 2 && parts[0] === "ai") {
            result.ai[parts[1]!] = data[envKey];
          } else {
            result[configKey] = data[envKey];
          }
        }
      }
      return result;
    }
    return { ai: {} };
  }
}

export const config = new EnvConfig();
