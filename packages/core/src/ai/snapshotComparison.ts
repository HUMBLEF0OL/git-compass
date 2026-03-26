import { AnalyticsSnapshot, Regression, SnapshotDelta, PRFileSummary, PRContextBrief, PromptTemplate, AIParseError, AIProvider, AIProviderType } from '../types/ai.js';
import { resolveTemplateInstructions } from './utils.js';
import { getAIProvider, resolveProvider } from './summarizer.js';


const HIGHER_IS_WORSE = new Set([
  'riskScoreAvg',
  'hotspotCount',
  'knowledgeSiloCount',
  'rotFileCount',
  'teamConsistencyScore', // higher CV = more erratic = worse
]);

/**
 * Pure function. Compares every key present in snapshotB.metrics against snapshotA.metrics.
 */
export function detectRegressions(
  snapshotA: AnalyticsSnapshot, 
  snapshotB: AnalyticsSnapshot
): { regressions: Regression[], improvements: Regression[] } {
  const regressions: Regression[] = [];
  const improvements: Regression[] = [];

  for (const [key, valueB] of Object.entries(snapshotB.metrics)) {
    const valueA = snapshotA.metrics[key];
    if (valueA === undefined) continue;

    const delta = valueB - valueA;
    if (delta === 0) continue;

    const percentChange = valueA === 0 ? 0 : Number(((delta / Math.abs(valueA)) * 100).toFixed(2));
    const higherIsWorse = HIGHER_IS_WORSE.has(key);

    let direction: 'improved' | 'regressed';
    if (higherIsWorse) {
      direction = delta > 0 ? 'regressed' : 'improved';
    } else {
      direction = delta < 0 ? 'regressed' : 'improved';
    }

    let severity: 'critical' | 'moderate' | 'minor' = 'minor';
    if (direction === 'regressed') {
      const absPercent = Math.abs(percentChange);
      if (absPercent >= 25) severity = 'critical';
      else if (absPercent >= 10) severity = 'moderate';
    }

    const reg: Regression = {
      metricName: key,
      previousValue: valueA,
      currentValue: valueB,
      delta,
      percentChange,
      severity,
      direction
    };

    if (direction === 'regressed') {
      regressions.push(reg);
    } else {
      improvements.push(reg);
    }
  }

  regressions.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
  improvements.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

  return { regressions, improvements };
}

/**
 * Pure function. Builds the narrative prompt.
 */
export function buildComparisonPrompt(
  delta: { regressions: Regression[], improvements: Regression[] }, 
  snapshotA: AnalyticsSnapshot, 
  snapshotB: AnalyticsSnapshot, 
  template?: PromptTemplate
): string {
  let prompt = "You are a senior engineering lead reviewing two snapshots of a codebase's health over time.\n";
  
  if (template) {
    prompt += `\n${resolveTemplateInstructions(template)}\n`;
  }

  prompt += `\n<snapshot_before>\n${JSON.stringify(snapshotA, null, 2)}\n</snapshot_before>\n`;
  prompt += `\n<snapshot_after>\n${JSON.stringify(snapshotB, null, 2)}\n</snapshot_after>\n`;
  prompt += `\n<computed_delta>\n${JSON.stringify(delta, null, 2)}\n</computed_delta>\n`;

  prompt += `\nRespond with a single JSON object and nothing else. No markdown. No explanation outside the JSON.
The object must have exactly one key:
  "narrative" (string — 2 to 4 paragraphs explaining what changed, why it matters, and what the team should prioritise).`;

  return prompt;
}

/**
 * Pure function. Returns the narrative string.
 */
export function parseComparisonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.narrative !== 'string' || parsed.narrative === '') {
      throw new Error('Invalid narrative');
    }
    return parsed.narrative;
  } catch (error) {
    throw new AIParseError(cleaned, error);
  }
}

/**
 * Async layer.
 */
export async function compareSnapshots(
  snapshotA: AnalyticsSnapshot, 
  snapshotB: AnalyticsSnapshot, 
  options?: { template?: PromptTemplate, apiKey?: string, provider?: AIProvider, providerType?: AIProviderType }
): Promise<SnapshotDelta> {
  const { regressions, improvements } = detectRegressions(snapshotA, snapshotB);
  const prompt = buildComparisonPrompt({ regressions, improvements }, snapshotA, snapshotB, options?.template);

  const provider = resolveProvider(options);

  const text = await provider.generateText(prompt, {
    maxTokens: 1000,
  });

  const narrative = parseComparisonResponse(text);

  return { 
    regressions, 
    improvements, 
    narrative, 
    snapshotA, 
    snapshotB, 
    generatedAt: new Date().toISOString() 
  };
}
