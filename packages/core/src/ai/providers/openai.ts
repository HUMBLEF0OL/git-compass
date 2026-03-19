import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";
import { ensurePackage } from "../../utils/pkg-installer.js";

export function createOpenAIProvider(apiKey: string): AIProvider {
  return {
    type: AIProviderType.OPENAI,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/openai");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createOpenAI } = await import("@ai-sdk/openai");
      
      const openai = createOpenAI({ apiKey });
      const prompt = buildSummaryPrompt(analysis);

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      });

      return {
        digest: text,
        generatedAt: new Date(),
        model: "gpt-4o",
        provider: AIProviderType.OPENAI,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/openai");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createOpenAI } = await import("@ai-sdk/openai");
      
      const openai = createOpenAI({ apiKey });
      const context = JSON.stringify(analysis, null, 2);

      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
        prompt: question,
      });

      return text;
    }
  };
}














