import { AIProvider, AIProviderType, AnalysisResult, AISummary, AIProviderOptions, AIInvokeOptions } from "../../types.js";

import { buildSummaryPrompt } from "../summarizer.js";
import { ensurePackage } from "../../utils/pkg-installer.js";

export function createAnthropicProvider(apiKey: string, options: AIProviderOptions = {}): AIProvider {
  const defaultModel = options.model || "claude-3-5-sonnet-20240620";

  return {
    type: AIProviderType.ANTHROPIC,
    model: defaultModel,

    generateSummary: async (analysis: AnalysisResult, invokeOptions: AIInvokeOptions = {}): Promise<AISummary> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/anthropic");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      const anthropic = createAnthropic({ apiKey });
      const modelName = invokeOptions.model || defaultModel;
      
      const basePrompt = buildSummaryPrompt(analysis);
      const systemInstructions = invokeOptions.systemInstructions || "";
      const prompt = invokeOptions.customPrompt || (systemInstructions ? `${systemInstructions}\n\n${basePrompt}` : basePrompt);

      const { text } = await generateText({
        model: anthropic(modelName),
        prompt,
      });

      return {
        digest: text,
        generatedAt: new Date(),
        model: modelName,
        provider: AIProviderType.ANTHROPIC,
      };
    },

    query: async (question: string, analysis: AnalysisResult, invokeOptions: AIInvokeOptions = {}): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/anthropic");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      const anthropic = createAnthropic({ apiKey });
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
        model: anthropic(modelName),
        system,
        prompt: invokeOptions.customPrompt || question,
      });

      return text;
    },

    generateText: async (prompt: string, invokeOptions: AIInvokeOptions = {}): Promise<string> => {
      await ensurePackage("ai");
      await ensurePackage("@ai-sdk/anthropic");
      // @ts-ignore - dynamically installed
      const { generateText } = await import("ai");
      // @ts-ignore - dynamically installed
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      const anthropic = createAnthropic({ apiKey });
      const modelName = invokeOptions.model || defaultModel;

      const { text } = await generateText({
        model: anthropic(modelName),
        ...(invokeOptions.systemInstructions ? { system: invokeOptions.systemInstructions } : {}),
        prompt: invokeOptions.customPrompt || prompt,
        ...(invokeOptions.maxTokens !== undefined ? { maxTokens: invokeOptions.maxTokens } : {}),
        ...(invokeOptions.temperature !== undefined ? { temperature: invokeOptions.temperature } : {}),
      });

      return text;
    },
  };
}
