import type { PromptTemplate, TemplateAudience, TemplateLength } from '../types/ai.js';

const audienceInstructions: Record<TemplateAudience, string> = {
  technical: 'Use technical language. Reference specific file paths, metrics, and code patterns.',
  executive: 'Use plain business language. Avoid jargon. Focus on risk, cost, and team impact.',
  onboarding: 'Write for a new team member. Explain context. Avoid assuming prior knowledge of the codebase.',
};

const lengthInstructions: Record<TemplateLength, string> = {
  brief: 'Be concise. Each insight should be 1 sentence. Total response under 300 words.',
  standard: 'Be thorough but focused. Each insight should be 2–3 sentences.',
  detailed: 'Be comprehensive. Include reasoning, context, and specific examples where possible.',
};

/**
 * Pure function. Returns a string that is injected into prompts when a template is provided.
 */
export function resolveTemplateInstructions(template: PromptTemplate): string {
  const audience = audienceInstructions[template.audience];
  const length = lengthInstructions[template.length];
  
  return `Audience: ${audience}\nLength: ${length}${
    template.customInstructions ? `\nAdditional instructions: ${template.customInstructions}` : ''
  }`;
}
