import { AIProvider, AIProviderType, AnalysisResult, AISummary, AIProviderOptions, AIInvokeOptions } from "../../types/ai.js";


import { buildSummaryPrompt } from "../summarizer.js";
import { ensurePackage } from "../../utils/pkg-installer.js";

export function createOpenAIProvider(apiKey: string, options: AIProviderOptions = {}): AIProvider {
  const defaultModel = options.model || "gpt-4o";

  return {
    type: AIProviderType.OPENAI,
    model: defaultModel,

    generateSummary: async (analysis: AnalysisResult, invokeOptions: AIInvokeOptions = {}): Promise<AISummary> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/openai");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createOpenAI } = await import("@ai-sdk/openai");

      const openai = createOpenAI({ apiKey });
      const modelName = invokeOptions.model || defaultModel;
      
      const basePrompt = buildSummaryPrompt(analysis);
      const systemInstructions = invokeOptions.systemInstructions || "";
      const prompt = invokeOptions.customPrompt || (systemInstructions ? `${systemInstructions}\n\n${basePrompt}` : basePrompt);

      const { text } = await generateText({
        model: openai(modelName),
        prompt,
      });

      return {
        digest: text,
        generatedAt: new Date(),
        model: modelName,
        provider: AIProviderType.OPENAI,
      };
    },

    query: async (question: string, analysis: AnalysisResult, invokeOptions: AIInvokeOptions = {}): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/openai");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createOpenAI } = await import("@ai-sdk/openai");

      const openai = createOpenAI({ apiKey });
      const modelName = invokeOptions.model || defaultModel;
      const context = JSON.stringify(analysis, null, 2);
      const baseSystem = `You are Git Compass, a specialized Git analytics assistant. 
GROUNDING RULES:
1. ONLY answer questions based on the provided repository analysis data.
2. If a user asks something unrelated to this specific codebase (e.g., general knowledge, jokes, unrelated programming questions), politely decline and state that you are only authorized to discuss this project's analysis.
3. Keep answers technical, concise, and professional.

Context:
${context}`;

      const system = invokeOptions.systemInstructions 
        ? `${invokeOptions.systemInstructions}\n\n${baseSystem}`
        : baseSystem;

      const { text } = await generateText({
        model: openai(modelName),
        system,
        prompt: invokeOptions.customPrompt || question,
      });

      return text;
    },

    generateText: async (prompt: string, invokeOptions: AIInvokeOptions = {}): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/openai");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createOpenAI } = await import("@ai-sdk/openai");

      const openai = createOpenAI({ apiKey });
      const modelName = invokeOptions.model || defaultModel;

      const { text } = await generateText({
        model: openai(modelName),
        ...(invokeOptions.systemInstructions ? { system: invokeOptions.systemInstructions } : {}),
        prompt: invokeOptions.customPrompt || prompt,
        ...(invokeOptions.maxTokens !== undefined ? { maxTokens: invokeOptions.maxTokens } : {}),
        ...(invokeOptions.temperature !== undefined ? { temperature: invokeOptions.temperature } : {}),
      });

      return text;
    },
  };
}
