import { describe, it, expect } from 'vitest';
import { 
  computeOnboardingScore, 
  generateLearningPath 
} from '../../src/analyzers/onboarding.js';
import type { GitCommit } from '../../src/types/signal.js';

describe('onboarding analyzer', () => {
  describe('computeOnboardingScore', () => {
    it('all zeros inputs → score=100, rating="excellent"', () => {
      const result = computeOnboardingScore(
        { rotFileCount: 0, totalFileCount: 10 },
        { siloFileCount: 0, totalFileCount: 10 },
        { avgBlastRadius: 0, maxBlastRadius: 0 },
        { avgChurnPerFile: 0 }
      );
      expect(result.score).toBe(100);
      expect(result.rating).toBe('excellent');
    });

    it('all max inputs → score=0, rating="poor"', () => {
      const result = computeOnboardingScore(
        { rotFileCount: 10, totalFileCount: 10 },
        { siloFileCount: 10, totalFileCount: 10 },
        { avgBlastRadius: 50, maxBlastRadius: 100 },
        { avgChurnPerFile: 500 }
      );
      expect(result.score).toBe(0);
      expect(result.rating).toBe('poor');
    });

    it('weighted composite is correct', () => {
      // codeHealth (rot=5/10) = 50. weight 0.25 -> 12.5
      // knowledgeDist (silo=5/10) = 50. weight 0.30 -> 15
      // safety (avgBlast=25/50) = 50. weight 0.25 -> 12.5
      // approachability (avgChurn=250/500) = 50. weight 0.20 -> 10
      // Total = 12.5 + 15 + 12.5 + 10 = 50
      const result = computeOnboardingScore(
        { rotFileCount: 5, totalFileCount: 10 },
        { siloFileCount: 5, totalFileCount: 10 },
        { avgBlastRadius: 25, maxBlastRadius: 50 },
        { avgChurnPerFile: 250 }
      );
      expect(result.score).toBe(50);
      expect(result.rating).toBe('fair');
    });

    it('weakestArea identifies the lowest sub-score key', () => {
      const result = computeOnboardingScore(
        { rotFileCount: 2, totalFileCount: 10 }, // 80
        { siloFileCount: 8, totalFileCount: 10 }, // 20
        { avgBlastRadius: 10, maxBlastRadius: 50 }, // 80
        { avgChurnPerFile: 100 } // 80
      );
      expect(result.weakestArea).toBe('knowledgeDistributionScore');
    });
  });

  describe('generateLearningPath', () => {
    it('excludes lockfile, generated, asset files', () => {
      const commits = [
        {
          hash: '1', message: 'm', date: '2024-01-01T',
          author: { name: 'A', email: 'a@ex.com' },
          files: ['package-lock.json', 'dist/bundle.js', 'img.png', 'src/app.ts'],
          parents: []
        } as unknown as GitCommit
      ];
      const result = generateLearningPath(commits);
      expect(result).toHaveLength(1);
      expect(result[0]!.filePath).toBe('src/app.ts');
    });

    it('order is 1-based ascending', () => {
      const commits = [
        {
          hash: '1', message: 'm', date: '2024-01-01T',
          author: { name: 'A', email: 'a@ex.com' },
          files: ['a.ts', 'b.ts'],
          parents: []
        } as unknown as GitCommit
      ];
      const result = generateLearningPath(commits);
      expect(result[0]!.order).toBe(1);
      if (result[1]) expect(result[1]!.order).toBe(2);
    });
  });
});
