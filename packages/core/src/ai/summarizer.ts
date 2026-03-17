import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult, AISummary } from "../types.js";

/**
 * Creates an Anthropic client for AI-augmented analytics.
 */
export function createAIClient(apiKey?: string): Anthropic {
  return new Anthropic({ apiKey });
}

/**
 * Builds the analysis prompt for the LLM.
 */
function buildSummaryPrompt(analysis: AnalysisResult): string {
  return `Analyze this Git repository data and provide a concise plain-English summary (3-5 sentences) covering: overall health, hotspot concerns, notable patterns, and any red flags.

Repository data:
- Total commits analyzed: ${analysis.meta.commitCount}
- Analysis window: ${analysis.meta.window}
- Top hotspot files: ${analysis.hotspots.slice(0, 3).map((h) => h.path).join(", ")}
- Active contributors: ${analysis.contributors.length}
- Burnout flags: ${analysis.burnout.flags.length > 0 ? analysis.burnout.flags.join(", ") : "none"}

Respond in plain English. No bullet points. No markdown formatting.`;

}

/**
 * Generates an AI summary of the repository analysis.
 */
export async function generateSummary(client: Anthropic, analysis: AnalysisResult): Promise<AISummary> {
  const prompt = buildSummaryPrompt(analysis);

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0];
  if (text?.type !== "text") throw new Error("Unexpected response type from AI");

  return {
    digest: text.text,
    generatedAt: new Date(),
    model: message.model,
  };
}

/**
 * Performs a natural language query against the repository analysis.
 */
export async function queryAnalysis(
  client: Anthropic,
  question: string,
  analysis: AnalysisResult,
): Promise<string> {
  const context = JSON.stringify(analysis, null, 2);

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 512,
    system: `You are Grotto, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
    messages: [{ role: "user", content: question }],
  });

  const text = message.content[0];
  if (text?.type !== "text") throw new Error("Unexpected response type from AI");

  return text.text;
}
