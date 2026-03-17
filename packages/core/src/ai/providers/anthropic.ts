import Anthropic from "@anthropic-ai/sdk";
import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey });

  return {
    type: AIProviderType.ANTHROPIC,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      const prompt = buildSummaryPrompt(analysis);
      const message = await client.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text = message.content[0];
      if (text?.type !== "text") throw new Error("Unexpected response type from Anthropic");

      return {
        digest: text.text,
        generatedAt: new Date(),
        model: message.model,
        provider: AIProviderType.ANTHROPIC,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      const context = JSON.stringify(analysis, null, 2);
      const message = await client.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 512,
        system: `You are Grotto, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}`,
        messages: [{ role: "user", content: question }],
      });

      const text = message.content[0];
      if (text?.type !== "text") throw new Error("Unexpected response type from Anthropic");
      return text.text;
    }
  };
}
