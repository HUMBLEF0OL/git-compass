import { describe, it, expect } from 'vitest';
import { compose, composeSync, withErrorHandler } from '../../src/infrastructure/pipeline.js';

describe('pipeline', () => {
  describe('compose', () => {
    it('executes steps in order', async () => {
      const step1 = (n: number) => n + 1;
      const step2 = (n: number) => n * 2;
      const pipeline = compose<number, number>(step1, step2);
      
      const result = await pipeline(5);
      expect(result).toBe(12); // (5 + 1) * 2
    });

    it('awaits async steps', async () => {
      const step1 = async (n: number) => n + 1;
      const step2 = async (n: number) => n * 2;
      const pipeline = compose<number, number>(step1, step2);
      
      const result = await pipeline(5);
      expect(result).toBe(12);
    });

    it('handles mix of sync and async steps', async () => {
      const step1 = (n: number) => n + 1;
      const step2 = async (n: number) => n * 2;
      const pipeline = compose<number, number>(step1, step2);
      
      expect(await pipeline(5)).toBe(12);
    });

    it('stepCount equals number of steps', () => {
      const p = compose(() => {}, () => {});
      expect(p.stepCount).toBe(2);
    });

    it('empty steps returns input unchanged', async () => {
      const p = compose<number, number>();
      expect(await p(10)).toBe(10);
      expect(p.stepCount).toBe(0);
    });

    it('propagates errors from steps', async () => {
      const errStep = () => { throw new Error('fail'); };
      const p = compose(errStep);
      await expect(p(1)).rejects.toThrow('fail');
    });
  });

  describe('composeSync', () => {
    it('executes steps in order synchronously', () => {
      const p = composeSync<number, number>(n => n + 1, n => n * 2);
      expect(p(5)).toBe(12);
    });

    it('empty steps returns input unchanged', () => {
      const p = composeSync<number, number>();
      expect(p(10)).toBe(10);
    });
  });

  describe('withErrorHandler', () => {
    it('returns pipeline result when no error', async () => {
      const p = compose<number, number>(n => n + 1);
      const wrapped = withErrorHandler(p, () => 999);
      expect(await wrapped(1)).toBe(2);
    });

    it('calls handler when pipeline throws', async () => {
      const p = compose<number, number>(() => { throw new Error('fail'); });
      const handler = (err: any, input: number) => input + 100;
      const wrapped = withErrorHandler(p, handler);
      
      expect(await wrapped(5)).toBe(105);
    });

    it('preserves stepCount of original pipeline', () => {
      const p = compose(() => {}, () => {});
      const wrapped = withErrorHandler(p, () => {});
      expect(wrapped.stepCount).toBe(2);
    });
  });
});
