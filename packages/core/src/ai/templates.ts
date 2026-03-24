import type { PromptTemplate } from '../types/ai.js';
import { generateInsightPack } from './insightPack.js';

/**
 * Factory function. Returns an object with a single summarize method 
 * that calls generateInsightPack with the template baked in.
 */
export function createSummarizerWithTemplate(template: PromptTemplate) {
  return {
    summarize: async (analyticsResult: object) => {
      return generateInsightPack(analyticsResult, { template });
    },
  };
}


export const DEFAULT_TEMPLATE: PromptTemplate = {
  audience: 'technical',
  length: 'standard',
};

export const EXECUTIVE_TEMPLATE: PromptTemplate = {
  audience: 'executive',
  length: 'brief',
};

export const ONBOARDING_TEMPLATE: PromptTemplate = {
  audience: 'onboarding',
  length: 'detailed',
};
