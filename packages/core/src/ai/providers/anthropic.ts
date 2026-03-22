import { AIProvider, AIProviderType, AnalysisResult, AISummary } from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";
import { ensurePackage } from "../../utils/pkg-installer.js";

export function createAnthropicProvider(apiKey: string): AIProvider {
  return {
    type: AIProviderType.ANTHROPIC,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/anthropic");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      const anthropic = createAnthropic({ apiKey });
      const prompt = buildSummaryPrompt(analysis);

      const { text } = await generateText({
        model: anthropic("claude-3-5-sonnet-20240620"),
        prompt,
      });

      return {
        digest: text,
        generatedAt: new Date(),
        model: "claude-3-5-sonnet-20240620",
        provider: AIProviderType.ANTHROPIC,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/anthropic");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      const anthropic = createAnthropic({ apiKey });
      const context = JSON.stringify(analysis, null, 2);

      const { text } = await generateText({
        model: anthropic("claude-3-5-sonnet-20240620"),
        system: `You are Git Compass, a specialized Git analytics assistant. 
GROUNDING RULES:
1. ONLY answer questions based on the provided repository analysis data.
2. If a user asks something unrelated to this specific codebase (e.g., general knowledge, jokes, unrelated programming questions), politely decline and state that you are only authorized to discuss this project's analysis.
3. Keep answers technical, concise, and professional.

Context:
${context}`,
        prompt: question,
      });

      return text;
    },
  };
}
