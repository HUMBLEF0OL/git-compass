import OpenAI from "openai";
import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey });

  return {
    type: AIProviderType.OPENAI,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      const prompt = buildSummaryPrompt(analysis);
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error("Unexpected response from OpenAI");

      return {
        digest: text,
        generatedAt: new Date(),
        model: response.model,
        provider: AIProviderType.OPENAI,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      const context = JSON.stringify(analysis, null, 2);
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}` },
          { role: "user", content: question }
        ],
        max_tokens: 512,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error("Unexpected response from OpenAI");
      return text;
    }
  };
}














