import { describe, it, expect } from 'vitest';
import { 
  buildInsightPackPrompt, 
  parseInsightPackResponse 
} from '../../src/ai/insightPack.js';
import { AIParseError } from '../../src/types/ai.js';

describe('insightPack', () => {
  describe('buildInsightPackPrompt', () => {
    it('contains <analytics> XML block', () => {
      const prompt = buildInsightPackPrompt('{"data": 1}');
      expect(prompt).toContain('<analytics>');
      expect(prompt).toContain('{"data": 1}');
      expect(prompt).toContain('</analytics>');
    });

    it('contains the required JSON instruction block verbatim', () => {
      const prompt = buildInsightPackPrompt('{}');
      expect(prompt).toContain('Respond with a single JSON object and nothing else.');
      expect(prompt).toContain('"critical", "warnings", "opportunities"');
    });

    it('includes audience instructions when template provided', () => {
      const prompt = buildInsightPackPrompt('{}', { audience: 'executive', length: 'brief' });
      expect(prompt).toContain('Audience: Use plain business language');
    });

    it('omits audience instructions when no template', () => {
      const prompt = buildInsightPackPrompt('{}');
      expect(prompt).not.toContain('Audience:');
    });

    it('same input always produces identical output (deterministic)', () => {
      const json = '{"a":1}';
      expect(buildInsightPackPrompt(json)).toBe(buildInsightPackPrompt(json));
    });
  });

  describe('parseInsightPackResponse', () => {
    const validResponse = JSON.stringify({
      critical: [{
        severity: 'critical',
        title: 'High Risk',
        description: 'Desc',
        evidence: ['file.ts'],
        recommendation: 'Fix it.'
      }],
      warnings: [],
      opportunities: []
    });

    it('parses valid JSON with all three keys', () => {
      const result = parseInsightPackResponse(validResponse);
      expect(result.critical).toHaveLength(1);
      expect(result.generatedAt).toBeDefined();
    });

    it('strips leading/trailing whitespace', () => {
      const result = parseInsightPackResponse(`   ${validResponse}   `);
      expect(result.critical).toHaveLength(1);
    });

    it('strips markdown fences before parsing', () => {
      const result = parseInsightPackResponse(`\`\`\`json\n${validResponse}\n\`\`\``);
      expect(result.critical).toHaveLength(1);
    });

    it('throws AIParseError on invalid JSON', () => {
      expect(() => parseInsightPackResponse('invalid')).toThrow(AIParseError);
    });

    it('throws AIParseError when "critical" key missing', () => {
      const invalid = JSON.stringify({ warnings: [], opportunities: [] });
      expect(() => parseInsightPackResponse(invalid)).toThrow(AIParseError);
    });

    it('throws AIParseError when insight missing "recommendation" key', () => {
      const invalid = JSON.stringify({
        critical: [{
          severity: 'critical',
          title: 'T',
          description: 'D',
          evidence: []
          // missing recommendation
        }],
        warnings: [],
        opportunities: []
      });
      expect(() => parseInsightPackResponse(invalid)).toThrow(AIParseError);
    });

    it('sets generatedAt to a valid ISO string', () => {
      const result = parseInsightPackResponse(validResponse);
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    });

    it('returns empty arrays for categories with no findings', () => {
      const result = parseInsightPackResponse(JSON.stringify({
        critical: [],
        warnings: [],
        opportunities: []
      }));
      expect(result.critical).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.opportunities).toEqual([]);
    });
  });
});
