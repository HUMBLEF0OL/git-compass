import { describe, it, expect } from 'vitest';
import { resolveTemplateInstructions } from '../../src/ai/utils.js';
import { 
  createSummarizerWithTemplate,
  DEFAULT_TEMPLATE,
  EXECUTIVE_TEMPLATE,
  ONBOARDING_TEMPLATE
} from '../../src/ai/templates.js';

describe('templates', () => {
  describe('resolveTemplateInstructions', () => {
    it('includes audience instructions for "technical"', () => {
      const result = resolveTemplateInstructions({ audience: 'technical', length: 'standard' });
      expect(result).toContain('Use technical language');
    });

    it('includes audience instructions for "executive"', () => {
      const result = resolveTemplateInstructions({ audience: 'executive', length: 'standard' });
      expect(result).toContain('Use plain business language');
    });

    it('includes audience instructions for "onboarding"', () => {
      const result = resolveTemplateInstructions({ audience: 'onboarding', length: 'standard' });
      expect(result).toContain('Write for a new team member');
    });

    it('includes length instructions for "brief"', () => {
      const result = resolveTemplateInstructions({ audience: 'technical', length: 'brief' });
      expect(result).toContain('Be concise');
    });

    it('includes length instructions for "standard"', () => {
      const result = resolveTemplateInstructions({ audience: 'technical', length: 'standard' });
      expect(result).toContain('Be thorough but focused');
    });

    it('includes length instructions for "detailed"', () => {
      const result = resolveTemplateInstructions({ audience: 'technical', length: 'detailed' });
      expect(result).toContain('Be comprehensive');
    });

    it('includes customInstructions when provided', () => {
      const result = resolveTemplateInstructions({ 
        audience: 'technical', 
        length: 'standard', 
        customInstructions: 'Focus on security.' 
      });
      expect(result).toContain('Additional instructions: Focus on security.');
    });

    it('omits customInstructions line when not provided', () => {
      const result = resolveTemplateInstructions({ audience: 'technical', length: 'standard' });
      expect(result).not.toContain('Additional instructions');
    });

    it('deterministic output for same input', () => {
      const t = { audience: 'technical' as const, length: 'standard' as const };
      expect(resolveTemplateInstructions(t)).toBe(resolveTemplateInstructions(t));
    });
  });

  describe('createSummarizerWithTemplate', () => {
    it('returns object with summarize method', () => {
      const summarizer = createSummarizerWithTemplate(DEFAULT_TEMPLATE);
      expect(summarizer).toHaveProperty('summarize');
      expect(typeof summarizer.summarize).toBe('function');
    });
  });

  describe('exported templates', () => {
    it('DEFAULT_TEMPLATE is technical/standard', () => {
      expect(DEFAULT_TEMPLATE.audience).toBe('technical');
      expect(DEFAULT_TEMPLATE.length).toBe('standard');
    });

    it('EXECUTIVE_TEMPLATE is executive/brief', () => {
      expect(EXECUTIVE_TEMPLATE.audience).toBe('executive');
      expect(EXECUTIVE_TEMPLATE.length).toBe('brief');
    });

    it('ONBOARDING_TEMPLATE is onboarding/detailed', () => {
      expect(ONBOARDING_TEMPLATE.audience).toBe('onboarding');
      expect(ONBOARDING_TEMPLATE.length).toBe('detailed');
    });
  });
});
