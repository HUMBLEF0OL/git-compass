import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../../types.js";

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
        system: `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
        prompt: question,
      });

      return text;
    }
  };
}










