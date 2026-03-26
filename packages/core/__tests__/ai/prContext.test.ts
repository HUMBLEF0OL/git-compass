import { describe, it, expect } from 'vitest';
import { 
  buildPRFileSummaries, 
  buildPRContextPrompt, 
  parsePRContextResponse 
} from '../../src/ai/prContext.js';
import { AIParseError } from '../../src/types/ai.js';

describe('prContext', () => {
  const mockInput = {
    changedFiles: ['a.ts', 'b.ts', 'silo.ts', 'blast.ts', 'hot.ts'],
    fileRiskScores: { 'a.ts': 80, 'b.ts': 50 },
    fileHotspotScores: { 'hot.ts': 65 },
    siloFiles: ['silo.ts'],
    fileBlastRadius: { 'blast.ts': 12 }
  };

  describe('buildPRFileSummaries', () => {
    it('riskLevel="high" when riskScore >= 70', () => {
      const result = buildPRFileSummaries(mockInput);
      const fileA = result.find(f => f.filePath === 'a.ts');
      expect(fileA!.riskLevel).toBe('high');
      expect(fileA!.riskReason).toContain('High risk score (80)');
    });

    it('riskLevel="high" when file is a knowledge silo', () => {
      const result = buildPRFileSummaries(mockInput);
      const fileSilo = result.find(f => f.filePath === 'silo.ts');
      expect(fileSilo!.riskLevel).toBe('high');
      expect(fileSilo!.riskReason).toContain('Knowledge silo');
    });

    it('riskLevel="high" when blastRadius >= 10', () => {
      const result = buildPRFileSummaries(mockInput);
      const fileBlast = result.find(f => f.filePath === 'blast.ts');
      expect(fileBlast!.riskLevel).toBe('high');
      expect(fileBlast!.riskReason).toContain('High blast radius');
    });

    it('riskLevel="medium" when hotspotScore >= 60', () => {
      const result = buildPRFileSummaries(mockInput);
      const fileHot = result.find(f => f.filePath === 'hot.ts');
      expect(fileHot!.riskLevel).toBe('medium');
      expect(fileHot!.riskReason).toContain('Hotspot');
    });

    it('riskLevel="medium" when riskScore 40–69', () => {
      const result = buildPRFileSummaries(mockInput);
      const fileB = result.find(f => f.filePath === 'b.ts');
      expect(fileB!.riskLevel).toBe('medium');
      expect(fileB!.riskReason).toContain('Moderate risk score (50)');
    });

    it('riskLevel="low" when no conditions match', () => {
      const result = buildPRFileSummaries({
        ...mockInput,
        changedFiles: ['low.ts'],
        fileRiskScores: { 'low.ts': 10 }
      });
      expect(result[0].riskLevel).toBe('low');
    });

    it('high risk takes priority over medium (first match wins)', () => {
      const result = buildPRFileSummaries({
        ...mockInput,
        changedFiles: ['mixed.ts'],
        fileRiskScores: { 'mixed.ts': 80 },
        fileHotspotScores: { 'mixed.ts': 90 }
      });
      expect(result[0].riskLevel).toBe('high');
      expect(result[0].riskReason).toContain('High risk score (80)');
    });

    it('missing file in score map treated as score=0', () => {
      const result = buildPRFileSummaries({
        ...mockInput,
        changedFiles: ['new.ts']
      });
      expect(result[0].riskLevel).toBe('low');
    });
  });

  describe('buildPRContextPrompt', () => {
    const fileSummaries = [{ filePath: 'a.ts', riskLevel: 'high' as const, riskReason: 'R' }];

    it('contains <changed_files> XML block', () => {
      const prompt = buildPRContextPrompt(fileSummaries, ['a.ts']);
      expect(prompt).toContain('<changed_files>');
      expect(prompt).toContain('a.ts');
      expect(prompt).toContain('</changed_files>');
    });

    it('contains <file_risk_profiles> XML block', () => {
      const prompt = buildPRContextPrompt(fileSummaries, ['a.ts']);
      expect(prompt).toContain('<file_risk_profiles>');
      expect(prompt).toContain('"riskLevel": "high"');
    });

    it('contains the required JSON instruction block verbatim', () => {
      const prompt = buildPRContextPrompt(fileSummaries, ['a.ts']);
      expect(prompt).toContain('"summary"');
      expect(prompt).toContain('"overallRisk"');
      expect(prompt).toContain('"reviewFocusAreas"');
    });

    it('includes template instructions when provided', () => {
      const prompt = buildPRContextPrompt(fileSummaries, ['a.ts'], { audience: 'technical', length: 'standard' });
      expect(prompt).toContain('Audience: Use technical language');
    });

    it('deterministic output for same input', () => {
      expect(buildPRContextPrompt(fileSummaries, ['a.ts'])).toBe(buildPRContextPrompt(fileSummaries, ['a.ts']));
    });
  });

  describe('parsePRContextResponse', () => {
    const fileSummaries = [{ filePath: 'a.ts', riskLevel: 'low' as const, riskReason: 'R' }];
    const validResponse = JSON.stringify({
      summary: 'Short summary.',
      overallRisk: 'low',
      reviewFocusAreas: ['focus']
    });

    it('parses valid JSON', () => {
      const result = parsePRContextResponse(validResponse, fileSummaries);
      expect(result.overallRisk).toBe('low');
      expect(result.fileSummaries).toEqual(fileSummaries);
    });

    it('strips markdown fences', () => {
      const result = parsePRContextResponse(`\`\`\`json\n${validResponse}\n\`\`\``, fileSummaries);
      expect(result.summary).toBe('Short summary.');
    });

    it('throws AIParseError on invalid JSON', () => {
      expect(() => parsePRContextResponse('invalid', fileSummaries)).toThrow(AIParseError);
    });

    it('throws AIParseError when overallRisk key missing', () => {
      const invalid = JSON.stringify({ summary: 'S', reviewFocusAreas: [] });
      expect(() => parsePRContextResponse(invalid, fileSummaries)).toThrow(AIParseError);
    });

    it('returned fileSummaries matches the passed-in summaries (not from AI)', () => {
      const result = parsePRContextResponse(validResponse, fileSummaries);
      expect(result.fileSummaries).toBe(fileSummaries);
    });

    it('sets generatedAt to a valid ISO string', () => {
      const result = parsePRContextResponse(validResponse, fileSummaries);
      expect(result.generatedAt).toBeDefined();
    });
  });
});
