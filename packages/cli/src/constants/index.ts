export const PROJECT_NAME = "Git Compass";

export const DEFAULT_BRANCH = "HEAD";
export const DEFAULT_WINDOW = "30d";
export const DEFAULT_MAX_COMMITS = 500;

export const CONFIG_KEYS = {
  AI_KEY: "ai.key",
  AI_PROVIDER: "ai.provider",
} as const;

export const ENV_VARS = {
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  GEMINI_API_KEY: "GEMINI_API_KEY",
  AI_PROVIDER: "GIT_COMPASS_AI_PROVIDER",
} as const;
