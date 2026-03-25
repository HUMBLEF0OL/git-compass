import { InsightPack, PromptTemplate, AIParseError, AIProvider, AIProviderType, AnalysisResult } from '../types/ai.js';
import { resolveTemplateInstructions } from './utils.js';
import { getAIProvider, resolveProvider } from './summarizer.js';


/**
 * Pure function. Builds the prompt string.
 */
export function buildInsightPackPrompt(analyticsJson: string, template?: PromptTemplate): string {
  let prompt = "You are a senior engineering lead analyzing a Git repository's health data.\n";
  
  if (template) {
    prompt += `\n${resolveTemplateInstructions(template)}\n`;
  }

  prompt += `\n<analytics>\n${analyticsJson}\n</analytics>\n`;
  
  prompt += `\nRespond with a single JSON object and nothing else. No markdown. No explanation outside the JSON.
The object must have exactly three keys: "critical", "warnings", "opportunities".
Each key maps to an array of insight objects. Each insight object must have exactly these keys:
  "severity" (one of: "critical", "warning", "opportunity"),
  "title" (string, max 10 words),
  "description" (string, 1–3 sentences),
  "evidence" (array of strings — file paths, author emails, or metric values),
  "recommendation" (string, one actionable sentence).
Return at least 1 item in "critical" if any metric indicates a serious concern.
Return an empty array [] for any category with no findings.`;

  return prompt;
}

/**
 * Pure function. Post-processes the raw string returned from the SDK.
 */
export function parseInsightPackResponse(raw: string): InsightPack {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    
    if (!parsed || typeof parsed !== 'object') throw new Error('Not an object');
    if (!Array.isArray(parsed.critical)) throw new Error('Missing critical array');
    if (!Array.isArray(parsed.warnings)) throw new Error('Missing warnings array');
    if (!Array.isArray(parsed.opportunities)) throw new Error('Missing opportunities array');

    const allInsights = [...parsed.critical, ...parsed.warnings, ...parsed.opportunities];
    for (const insight of allInsights) {
      if (!insight.severity || !insight.title || !insight.description || !Array.isArray(insight.evidence) || !insight.recommendation) {
        throw new Error('Insight missing required keys');
      }
    }

    return {
      critical: parsed.critical,
      warnings: parsed.warnings,
      opportunities: parsed.opportunities,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new AIParseError(cleaned, error);
  }
}

/**
 * Async layer. Calls the AI engine.
 */
export async function generateInsightPack(
  analysis: AnalysisResult, 
  options?: { template?: PromptTemplate, apiKey?: string, provider?: AIProvider, providerType?: AIProviderType }
): Promise<InsightPack> {
  const serialized = JSON.stringify(analysis, null, 2);

  const prompt = buildInsightPackPrompt(serialized, options?.template);

  const provider = resolveProvider(options);

  const text = await provider.generateText(prompt, {
    maxTokens: 1000,
  });

  return parseInsightPackResponse(text);
}
