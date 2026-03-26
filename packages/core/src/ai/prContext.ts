import { PRFileSummary, PRContextBrief, PromptTemplate, AIParseError, AIProvider, AIProviderType } from '../types/ai.js';
import { resolveTemplateInstructions } from './utils.js';
import { getAIProvider, resolveProvider } from './summarizer.js';


interface PRAnalyticsInput {
  changedFiles: string[];
  fileRiskScores: Record<string, number>;
  fileHotspotScores: Record<string, number>;
  siloFiles: string[];
  fileBlastRadius: Record<string, number>;
}

/**
 * Pure function. Derives risk level and reason for each changed file.
 */
export function buildPRFileSummaries(input: PRAnalyticsInput): PRFileSummary[] {
  return input.changedFiles.map(filePath => {
    const riskScore = input.fileRiskScores[filePath] || 0;
    const isSilo = input.siloFiles.includes(filePath);
    const blastRadius = input.fileBlastRadius[filePath] || 0;
    const hotspotScore = input.fileHotspotScores[filePath] || 0;

    if (riskScore >= 70) {
      return { 
        filePath, 
        riskLevel: 'high', 
        riskReason: `High risk score (${riskScore}) — frequently changed with multiple authors` 
      };
    }
    if (isSilo) {
      return { 
        filePath, 
        riskLevel: 'high', 
        riskReason: 'Knowledge silo — single author owns this file' 
      };
    }
    if (blastRadius >= 10) {
      return { 
        filePath, 
        riskLevel: 'high', 
        riskReason: `High blast radius (${blastRadius} files affected on average)` 
      };
    }
    if (hotspotScore >= 60) {
      return { 
        filePath, 
        riskLevel: 'medium', 
        riskReason: 'Hotspot — above-average change frequency' 
      };
    }
    if (riskScore >= 40) {
      return { 
        filePath, 
        riskLevel: 'medium', 
        riskReason: `Moderate risk score (${riskScore})` 
      };
    }
    return { 
      filePath, 
      riskLevel: 'low', 
      riskReason: 'Low historical risk' 
    };
  });
}

/**
 * Pure function. Builds the prompt.
 */
export function buildPRContextPrompt(
  fileSummaries: PRFileSummary[], 
  changedFiles: string[], 
  template?: PromptTemplate
): string {
  let prompt = "You are a senior code reviewer assessing the risk profile of a pull request.\n";
  
  if (template) {
    prompt += `\n${resolveTemplateInstructions(template)}\n`;
  }

  prompt += `\n<changed_files>\n${changedFiles.join('\n')}\n</changed_files>\n`;
  prompt += `\n<file_risk_profiles>\n${JSON.stringify(fileSummaries, null, 2)}\n</file_risk_profiles>\n`;
  
  prompt += `\nRespond with a single JSON object and nothing else. No markdown. No explanation outside the JSON.
The object must have exactly these keys:
  "summary" (string — one paragraph plain-English PR risk summary),
  "overallRisk" (one of: "high", "medium", "low"),
  "reviewFocusAreas" (array of strings — specific things a reviewer should check).`;

  return prompt;
}

/**
 * Pure function.
 */
export function parsePRContextResponse(raw: string, fileSummaries: PRFileSummary[]): PRContextBrief {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') throw new Error('Not an object');
    if (typeof parsed.summary !== 'string') throw new Error('Missing summary');
    if (!['high', 'medium', 'low'].includes(parsed.overallRisk)) throw new Error('Invalid overallRisk');
    if (!Array.isArray(parsed.reviewFocusAreas)) throw new Error('Missing focus areas');

    return {
      summary: parsed.summary,
      fileSummaries,
      overallRisk: parsed.overallRisk,
      reviewFocusAreas: parsed.reviewFocusAreas,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new AIParseError(cleaned, error);
  }
}

/**
 * Async layer.
 */
export async function generatePRContext(
  input: PRAnalyticsInput, 
  options?: { template?: PromptTemplate, apiKey?: string, provider?: AIProvider, providerType?: AIProviderType }
): Promise<PRContextBrief> {
  const fileSummaries = buildPRFileSummaries(input);
  const prompt = buildPRContextPrompt(fileSummaries, input.changedFiles, options?.template);

  const provider = resolveProvider(options);

  const text = await provider.generateText(prompt, {
    maxTokens: 1000,
  });

  return parsePRContextResponse(text, fileSummaries);
}
