import {
  AIProvider,
  AIProviderType,
  AnalysisResult,
  AISummary
} from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";
import { ensurePackage } from "../../utils/pkg-installer.js";

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    type: AIProviderType.GEMINI,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/google");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

      const google = createGoogleGenerativeAI({ apiKey });
      const prompt = buildSummaryPrompt(analysis);

      const { text } = await generateText({
        model: google("gemini-1.5-pro"),
        prompt,
      });

      return {
        digest: text,
        generatedAt: new Date(),
        model: "gemini-1.5-pro",
        provider: AIProviderType.GEMINI,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/google");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

      const google = createGoogleGenerativeAI({ apiKey });
      const context = JSON.stringify(analysis, null, 2);

      const { text } = await generateText({
        model: google("gemini-1.5-pro"),
        system: `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
        prompt: question,
      });

      return text;
    }
  };
}













