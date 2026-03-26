import { describe, it, expect, vi } from 'vitest';
import { generateInsightPack } from '../../src/ai/insightPack.js';
import { AIProvider, AIProviderType } from '../../src/types.js';

describe('AI Provider Integration', () => {
  it('uses the provided AI engine instead of hardcoded defaults', async () => {
    const mockProvider: AIProvider = {
      type: AIProviderType.OPENAI,
      model: 'gpt-4o',
      generateSummary: vi.fn(),
      query: vi.fn(),
      generateText: vi.fn().mockResolvedValue(JSON.stringify({
        critical: [],
        warnings: [],
        opportunities: []
      }))
    };

    const result = await generateInsightPack({}, { provider: mockProvider });
    
    expect(mockProvider.generateText).toHaveBeenCalled();
    expect(result.critical).toEqual([]);
    expect(result.generatedAt).toBeDefined();
  });
});
