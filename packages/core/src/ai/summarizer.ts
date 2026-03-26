import { 
  AIProviderType, 
  AnalysisResult, 
  AISummary, 
  AIProviderOptions, 
  AIProvider,
  PromptTemplate
} from "../types/ai.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { resolveTemplateInstructions } from "./utils.js";

/**
 * Builds the analysis prompt for the LLM with enriched context.
 * Pure function.
 */
export function buildSummaryPrompt(analysis: AnalysisResult): string {
  const hotspotLines = analysis.hotspots.hotspots
    .slice(0, 5)
    .map((h) => `- ${h.path} (${h.changeCount} changes, Authors: ${h.uniqueAuthors})`)
    .join("\n");

  const riskLines = analysis.risk.fileRisks
    .filter((r) => r.level === "critical" || r.level === "high")
    .slice(0, 5)
    .map((r) => `- ${r.path} (Score: ${r.score}, Level: ${r.level})`)
    .join("\n");

  const health = analysis.health;

  return `You are Git Compass, a highly technical Git architecture consultant. Analyze the following repository data and provide a structured assessment.

STRICT FORMATTING RULES:
1. NO MARKDOWN: Do not use asterisks (**), hashes (###), or underscores (_).
2. HEADERS: Use ALL CAPS for headers (e.g., ARCHITECTURAL RISK).
3. BULLETS: Use simple dashes (-) for bullet points.
4. TERMINAL FRIENDLY: Ensure it looks professional in a fixed-width terminal.

DATA FOR ${analysis.meta.repoPath} (${analysis.meta.branch}):
- Commits: ${analysis.meta.commitCount}
- Window: ${analysis.meta.windowDays} days

HEALTH METRICS (0-100 scale):
- Stability: ${health.stability}%
- Velocity: ${health.velocity}%
- Simplicity: ${health.simplicity}%
- Coverage: ${health.coverage}%

TOP HOTSPOTS:
${hotspotLines || "None significant"}

HIGH RISK FILES:
${riskLines || "No high-risk files flagged"}

Provide a sharp, professional assessment with actionable feedback.`;
}

/**
 * Factory function to create an AI provider.
 */
export function getAIProvider(type: AIProviderType, apiKey: string, options?: AIProviderOptions): AIProvider {
  switch (type) {
    case AIProviderType.ANTHROPIC:
      return createAnthropicProvider(apiKey, options);
    case AIProviderType.OPENAI:
      return createOpenAIProvider(apiKey, options);
    case AIProviderType.GEMINI:
      return createGeminiProvider(apiKey, options);
    default:
      throw new Error(`Unsupported AI provider: ${type}`);
  }
}

/**
 * Resolves the best available AI provider based on options or environment variables.
 */
export function resolveProvider(options?: { 
  provider?: AIProvider, 
  providerType?: AIProviderType, 
  apiKey?: string 
}): AIProvider {
  if (options?.provider) return options.provider;

  const type = options?.providerType || detectProviderType();
  const apiKey = options?.apiKey || getEnvApiKey(type);

  if (!apiKey) {
    throw new Error(`No API key found for AI provider: ${type}. Please provide it via options or environment variables.`);
  }

  return getAIProvider(type, apiKey);
}

function detectProviderType(): AIProviderType {
  if (process.env.ANTHROPIC_API_KEY) return AIProviderType.ANTHROPIC;
  if (process.env.OPENAI_API_KEY) return AIProviderType.OPENAI;
  if (process.env.GOOGLE_GENAI_API_KEY) return AIProviderType.GEMINI;
  return AIProviderType.ANTHROPIC; // Default fallback
}

function getEnvApiKey(type: AIProviderType): string | undefined {
  switch (type) {
    case AIProviderType.ANTHROPIC: return process.env.ANTHROPIC_API_KEY;
    case AIProviderType.OPENAI: return process.env.OPENAI_API_KEY;
    case AIProviderType.GEMINI: return process.env.GOOGLE_GENAI_API_KEY;
    default: return undefined;
  }
}

/**
 * Generates an AI summary of the repository analysis using the given provider.
 */
export async function generateSummary(
  provider: AIProvider,
  analysis: AnalysisResult,
): Promise<AISummary> {
  return provider.generateSummary(analysis);
}

/**
 * Performs a natural language query against the repository analysis using the given provider.
 */
export async function queryAnalysis(
  provider: AIProvider,
  question: string,
  analysis: AnalysisResult,
): Promise<string> {
  return provider.query(question, analysis);
}

// Deprecated or compatibility exports if needed, but since we are refactoring, we can keep it clean.
// Legacy createAIClient could be aliased if necessary for backward compatibility during transition.
export const createAIClient = (apiKey: string) => createAnthropicProvider(apiKey);

/**
 * Performs a summarization using a specific prompt template.
 */
export async function summarizeWithTemplate(
  provider: AIProvider,
  analysis: AnalysisResult,
  template: PromptTemplate
): Promise<AISummary> {
  const instructions = resolveTemplateInstructions(template);
  // Rule 5.5: pass template instructions as systemInstructions to the provider
  return provider.generateSummary(analysis, { 
    systemInstructions: instructions 
  });
}
