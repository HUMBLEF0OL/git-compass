import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../types.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createGeminiProvider } from "./providers/gemini.js";

/**
 * Builds the analysis prompt for the LLM with enriched context.
 */
export function buildSummaryPrompt(analysis: AnalysisResult): string {
  const hotspots = analysis.hotspots.slice(0, 5)
    .map(h => `- ${h.path} (${h.changeCount} changes, Risk: ${h.riskLevel})`)
    .join("\n");

  const silos = analysis.knowledge.filter(k => k.riskLevel === "high")
    .map(k => `- ${k.path} (Main: ${k.mainContributor}, ${k.authorshipPercent}%)`)
    .join("\n");

  const coupling = analysis.coupling.slice(0, 3)
    .map(c => `- ${c.head} <-> ${c.tail} (${(c.coupling * 100).toFixed(0)}% related)`)
    .join("\n");

  return `You are Grotto, a highly technical Git architecture consultant. Analyze the following repository data and provide a structured, opinionated, and professional assessment.

STRICT FORMATTING RULES:
1. NO MARKDOWN: Do not use asterisks (**), hashes (###), or underscores (_).
2. HEADERS: Use ALL CAPS for headers followed by a line of dashes (e.g., ARCHITECTURAL RISK).
3. BULLETS: Use simple dashes (-) for bullet points.
4. TERMINAL FRIENDLY: Ensure it looks professional in a fixed-width terminal.

DATA FOR ${analysis.meta.repoPath} (${analysis.meta.branch}):
- Commits: ${analysis.meta.commitCount}
- Window: ${analysis.meta.window}

TOP HOTSPOTS (High churn/complexity):
${hotspots || "None significant"}

KNOWLEDGE SILOS (High bus-factor risk):
${silos || "No extreme silos"}

TEMPORAL COUPLING (Unexpected dependencies):
${coupling || "No strong coupling found"}

HEALTH INDICATORS:
- Burnout Flags: ${analysis.burnout.flags.join(", ") || "None"}
- Avg. Blast Radius: ${analysis.impact.length > 0 ? (analysis.impact.reduce((acc, i) => acc + i.blastRadius, 0) / analysis.impact.length).toFixed(2) : 0} files

Provide a sharp, professional assessment with actionable feedback.`;
}

/**
 * Factory function to create an AI provider.
 */
export function getAIProvider(type: AIProviderType, apiKey: string): AIProvider {
  switch (type) {
    case AIProviderType.ANTHROPIC:
      return createAnthropicProvider(apiKey);
    case AIProviderType.OPENAI:
      return createOpenAIProvider(apiKey);
    case AIProviderType.GEMINI:
      return createGeminiProvider(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${type}`);
  }
}

/**
 * Generates an AI summary of the repository analysis using the given provider.
 */
export async function generateSummary(provider: AIProvider, analysis: AnalysisResult): Promise<AISummary> {
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
