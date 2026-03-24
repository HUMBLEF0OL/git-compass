import { describe, it, expect } from 'vitest';
import { classifyFile } from '../../src/parser/fileClassifier.js';

describe('fileClassifier', () => {
  it('should classify "package-lock.json" as lockfile noise', () => {
    const result = classifyFile('package-lock.json');
    expect(result.category).toBe('lockfile');
    expect(result.isNoise).toBe(true);
    expect(result.noiseReason).toBe('lockfile');
  });

  it('should classify "yarn.lock" as lockfile noise', () => {
    const result = classifyFile('yarn.lock');
    expect(result.category).toBe('lockfile');
    expect(result.isNoise).toBe(true);
  });

  it('should classify snapshots as generated noise', () => {
    const result = classifyFile('src/store/__snapshots__/store.test.ts.snap');
    expect(result.category).toBe('generated');
    expect(result.isNoise).toBe(true);
    expect(result.noiseReason).toBe('generated');
  });

  it('should classify minified files as generated noise', () => {
    const result = classifyFile('dist/index.min.js');
    expect(result.category).toBe('generated');
    expect(result.isNoise).toBe(true);
  });

  it('should classify images as asset noise', () => {
    const result = classifyFile('public/logo.png');
    expect(result.category).toBe('asset');
    expect(result.isNoise).toBe(true);
    expect(result.noiseReason).toBe('asset');
  });

  it('should classify GitHub workflows as CI and NOT noise', () => {
    const result = classifyFile('.github/workflows/ci.yml');
    expect(result.category).toBe('ci');
    expect(result.isNoise).toBe(false);
  });

  it('should classify README.md as docs and NOT noise', () => {
    const result = classifyFile('README.md');
    expect(result.category).toBe('docs');
    expect(result.isNoise).toBe(false);
  });

  it('should classify tsconfig.json as config and NOT noise', () => {
    const result = classifyFile('tsconfig.json');
    expect(result.category).toBe('config');
    expect(result.isNoise).toBe(false);
  });

  it('should classify package.json as config and NOT noise', () => {
    const result = classifyFile('package.json');
    expect(result.category).toBe('config');
    expect(result.isNoise).toBe(false);
  });

  it('should classify .eslintrc.js as config and NOT noise', () => {
    const result = classifyFile('.eslintrc.js');
    expect(result.category).toBe('config');
    expect(result.isNoise).toBe(false);
  });

  it('should classify test files as test and NOT noise', () => {
    const result = classifyFile('src/__tests__/foo.test.ts');
    expect(result.category).toBe('test');
    expect(result.isNoise).toBe(false);
  });

  it('should classify source files as source and NOT noise', () => {
    const result = classifyFile('src/analyzers/hotspots.ts');
    expect(result.category).toBe('source');
    expect(result.isNoise).toBe(false);
  });

  it('should be case-insensitive', () => {
    const result = classifyFile('YARN.LOCK');
    expect(result.category).toBe('lockfile');
  });

  it('should have null noiseReason for non-noise files', () => {
    const result = classifyFile('src/index.ts');
    expect(result.isNoise).toBe(false);
    expect(result.noiseReason).toBe(null);
  });
});
