import { describe, it, expect } from 'vitest';
import { 
  detectRegressions, 
  buildComparisonPrompt, 
  parseComparisonResponse 
} from '../../src/ai/snapshotComparison.js';
import { AnalyticsSnapshot, AIParseError } from '../../src/types/ai.js';

const makeSnapshot = (metrics: Partial<AnalyticsSnapshot['metrics']> = {}): AnalyticsSnapshot => ({
  capturedAt: '2024-01-15T00:00:00.000Z',
  windowDays: 30,
  metrics: {
    riskScoreAvg: 30,
    hotspotCount: 5,
    knowledgeSiloCount: 2,
    rotFileCount: 3,
    onboardingScore: 72,
    reviewCoverageRatio: 0.85,
    teamConsistencyScore: 0.25,
    ...metrics,
  },
});

describe('snapshotComparison', () => {
  describe('detectRegressions', () => {
    it('delta=0 metrics are excluded from both arrays', () => {
      const s1 = makeSnapshot();
      const s2 = makeSnapshot();
      const { regressions, improvements } = detectRegressions(s1, s2);
      expect(regressions).toHaveLength(0);
      expect(improvements).toHaveLength(0);
    });

    it('riskScoreAvg increase -> direction="regressed"', () => {
      const s1 = makeSnapshot({ riskScoreAvg: 30 });
      const s2 = makeSnapshot({ riskScoreAvg: 40 });
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].metricName).toBe('riskScoreAvg');
      expect(regressions[0].direction).toBe('regressed');
    });

    it('riskScoreAvg decrease -> direction="improved"', () => {
      const s1 = makeSnapshot({ riskScoreAvg: 30 });
      const s2 = makeSnapshot({ riskScoreAvg: 20 });
      const { improvements } = detectRegressions(s1, s2);
      expect(improvements[0].metricName).toBe('riskScoreAvg');
      expect(improvements[0].direction).toBe('improved');
    });

    it('onboardingScore decrease -> direction="regressed"', () => {
      const s1 = makeSnapshot({ onboardingScore: 80 });
      const s2 = makeSnapshot({ onboardingScore: 70 });
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].metricName).toBe('onboardingScore');
      expect(regressions[0].direction).toBe('regressed');
    });

    it('onboardingScore increase -> direction="improved"', () => {
      const s1 = makeSnapshot({ onboardingScore: 70 });
      const s2 = makeSnapshot({ onboardingScore: 80 });
      const { improvements } = detectRegressions(s1, s2);
      expect(improvements[0].metricName).toBe('onboardingScore');
      expect(improvements[0].direction).toBe('improved');
    });

    it('reviewCoverageRatio decrease -> direction="regressed"', () => {
      const s1 = makeSnapshot({ reviewCoverageRatio: 0.9 });
      const s2 = makeSnapshot({ reviewCoverageRatio: 0.8 });
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].metricName).toBe('reviewCoverageRatio');
      expect(regressions[0].direction).toBe('regressed');
    });

    it('severity="critical" at >= 25% change', () => {
      const s1 = makeSnapshot({ hotspotCount: 10 });
      const s2 = makeSnapshot({ hotspotCount: 13 }); // +30%
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].severity).toBe('critical');
    });

    it('severity="moderate" at >= 10% change', () => {
      const s1 = makeSnapshot({ hotspotCount: 10 });
      const s2 = makeSnapshot({ hotspotCount: 11 }); // +10%
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].severity).toBe('moderate');
    });

    it('severity="minor" below 10% change', () => {
      const s1 = makeSnapshot({ hotspotCount: 100 });
      const s2 = makeSnapshot({ hotspotCount: 105 }); // +5%
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].severity).toBe('minor');
    });

    it('improvements always have severity="minor"', () => {
      const s1 = makeSnapshot({ riskScoreAvg: 100 });
      const s2 = makeSnapshot({ riskScoreAvg: 50 }); // -50%
      const { improvements } = detectRegressions(s1, s2);
      expect(improvements[0].severity).toBe('minor');
    });

    it('regressions sorted by abs(percentChange) descending', () => {
      const s1 = makeSnapshot({ hotspotCount: 10, riskScoreAvg: 10 });
      const s2 = makeSnapshot({ hotspotCount: 11, riskScoreAvg: 15 }); // +10%, +50%
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].metricName).toBe('riskScoreAvg');
      expect(regressions[1].metricName).toBe('hotspotCount');
    });

    it('improvements sorted by abs(percentChange) descending', () => {
      const s1 = makeSnapshot({ hotspotCount: 10, riskScoreAvg: 10 });
      const s2 = makeSnapshot({ hotspotCount: 9, riskScoreAvg: 5 }); // -10%, -50%
      const { improvements } = detectRegressions(s1, s2);
      expect(improvements[0].metricName).toBe('riskScoreAvg');
      expect(improvements[1].metricName).toBe('hotspotCount');
    });

    it('percentChange rounds to 2 decimal places', () => {
      const s1 = makeSnapshot({ hotspotCount: 3 });
      const s2 = makeSnapshot({ hotspotCount: 4 }); // +33.333...%
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].percentChange).toBe(33.33);
    });

    it('snapshotA metric=0 -> percentChange=0 (no divide-by-zero)', () => {
      const s1 = makeSnapshot({ hotspotCount: 0 });
      const s2 = makeSnapshot({ hotspotCount: 10 });
      const { regressions } = detectRegressions(s1, s2);
      expect(regressions[0].percentChange).toBe(0);
    });

    it('metric only in snapshotB is skipped (no snapshotA baseline)', () => {
      const s1 = makeSnapshot();
      const s2 = { ...s1, metrics: { ...s1.metrics, extra: 100 } };
      const { regressions } = detectRegressions(s1, s2 as any);
      expect(regressions.find(r => r.metricName === 'extra')).toBeUndefined();
    });

    it('all metrics improved -> regressions=[]', () => {
      const s1 = makeSnapshot({ hotspotCount: 10 });
      const s2 = makeSnapshot({ hotspotCount: 5 });
      const { regressions, improvements } = detectRegressions(s1, s2);
      expect(regressions).toHaveLength(0);
      expect(improvements).toHaveLength(1);
    });

    it('all metrics regressed -> improvements=[]', () => {
      const s1 = makeSnapshot({ hotspotCount: 10 });
      const s2 = makeSnapshot({ hotspotCount: 15 });
      const { regressions, improvements } = detectRegressions(s1, s2);
      expect(regressions).toHaveLength(1);
      expect(improvements).toHaveLength(0);
    });
  });

  describe('buildComparisonPrompt', () => {
    const delta = { regressions: [], improvements: [] };
    const s1 = makeSnapshot();
    const s2 = makeSnapshot();

    it('contains <snapshot_before> XML block', () => {
      const prompt = buildComparisonPrompt(delta, s1, s2);
      expect(prompt).toContain('<snapshot_before>');
    });

    it('contains <snapshot_after> XML block', () => {
      const prompt = buildComparisonPrompt(delta, s1, s2);
      expect(prompt).toContain('<snapshot_after>');
    });

    it('contains <computed_delta> XML block', () => {
      const prompt = buildComparisonPrompt(delta, s1, s2);
      expect(prompt).toContain('<computed_delta>');
    });

    it('contains JSON instruction block', () => {
      const prompt = buildComparisonPrompt(delta, s1, s2);
      expect(prompt).toContain('"narrative"');
    });

    it('deterministic for same input', () => {
      expect(buildComparisonPrompt(delta, s1, s2)).toBe(buildComparisonPrompt(delta, s1, s2));
    });
  });

  describe('parseComparisonResponse', () => {
    it('returns narrative string from valid JSON', () => {
      const res = JSON.stringify({ narrative: 'Steady progress.' });
      expect(parseComparisonResponse(res)).toBe('Steady progress.');
    });

    it('strips markdown fences', () => {
      const res = `\`\`\`json\n{"narrative": "X"}\n\`\`\``;
      expect(parseComparisonResponse(res)).toBe('X');
    });

    it('throws AIParseError on invalid JSON', () => {
      expect(() => parseComparisonResponse('invalid')).toThrow(AIParseError);
    });

    it('throws AIParseError when narrative key missing', () => {
      expect(() => parseComparisonResponse('{}')).toThrow(AIParseError);
    });

    it('throws AIParseError when narrative is empty string', () => {
      expect(() => parseComparisonResponse('{"narrative": ""}')).toThrow(AIParseError);
    });
  });
});
