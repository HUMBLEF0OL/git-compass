import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  AIProvider, 
  AIProviderType, 
  AnalysisResult, 
  AISummary 
} from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";

export function createGeminiProvider(apiKey: string): AIProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  return {
    type: AIProviderType.GEMINI,

    generateSummary: async (analysis: AnalysisResult): Promise<AISummary> => {
      const prompt = buildSummaryPrompt(analysis);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        digest: text,
        generatedAt: new Date(),
        model: "gemini-1.5-pro",
        provider: AIProviderType.GEMINI,
      };
    },

    query: async (question: string, analysis: AnalysisResult): Promise<string> => {
      const context = JSON.stringify(analysis, null, 2);
      const prompt = `You are Git Compass, a Git analytics assistant. Answer questions about this repository analysis concisely and accurately. Context:\n${context}\n\nQuestion: ${question}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  };
}














