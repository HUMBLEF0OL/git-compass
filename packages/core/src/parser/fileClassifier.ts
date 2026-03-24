import { ClassifiedFile, FileCategory } from '../types/signal.js';

const LOCKFILES = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'npm-shrinkwrap.json',
  'gemfile.lock',
  'poetry.lock',
  'cargo.lock',
  'composer.lock',
  'packages.lock.json',
];

const ASSET_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.pdf'
];

/**
 * Classifies a file based on its path and name.
 */
export function classifyFile(filePath: string): ClassifiedFile {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/'); // Ensure forward slashes
  const fileName = normalizedPath.split('/').pop() || '';
  const extension = normalizedPath.includes('.') ? `.${normalizedPath.split('.').pop()}` : '';
  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

  // 1. Lockfile
  if (LOCKFILES.includes(fileName)) {
    return { filePath, category: 'lockfile', isNoise: true, noiseReason: 'lockfile' };
  }

  // 2. Generated
  const pathForDirectoryMatch = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  if (
    extension === '.snap' ||
    fileName.endsWith('.min.js') ||
    fileName.endsWith('.min.css') ||
    pathForDirectoryMatch.includes('/dist/') ||
    pathForDirectoryMatch.includes('/__generated__/') ||
    ['schema.graphql', 'openapi.json', 'openapi.yaml'].includes(fileName)
  ) {
    return { filePath, category: 'generated', isNoise: true, noiseReason: 'generated' };
  }

  // 3. Asset
  if (ASSET_EXTENSIONS.includes(extension)) {
    return { filePath, category: 'asset', isNoise: true, noiseReason: 'asset' };
  }

  // 4. CI
  if (
    normalizedPath.startsWith('.github/') ||
    normalizedPath.startsWith('.gitlab/') ||
    normalizedPath.startsWith('.circleci/') ||
    fileName === 'dockerfile' ||
    ['.travis.yml', '.gitlab-ci.yml'].includes(fileName) ||
    normalizedPath.startsWith('.husky/')
  ) {
    return { filePath, category: 'ci', isNoise: false, noiseReason: null };
  }

  // 5. Docs
  if (
    ['.md', '.mdx'].includes(extension) ||
    ['changelog', 'license', 'readme', 'contributing', 'authors', 'codeowners'].includes(fileNameWithoutExt)
  ) {
    return { filePath, category: 'docs', isNoise: false, noiseReason: null };
  }

  // 6. Config
  if (
    fileName === 'package.json' ||
    (fileName.startsWith('tsconfig') && fileName.endsWith('.json')) ||
    fileName.endsWith('.config.js') ||
    fileName.endsWith('.config.ts') ||
    fileName.endsWith('.config.mjs') ||
    fileName.startsWith('.eslintrc') ||
    fileName.startsWith('.prettierrc') ||
    fileName.startsWith('babel.config.') ||
    fileName.startsWith('jest.config.') ||
    fileName.startsWith('vitest.config.') ||
    ['.editorconfig', '.nvmrc', '.node-version'].includes(fileName)
  ) {
    return { filePath, category: 'config', isNoise: false, noiseReason: null };
  }

  // 7. Test
  if (
    normalizedPath.includes('/__tests__/') ||
    normalizedPath.includes('.test.') ||
    normalizedPath.includes('.spec.') ||
    normalizedPath.includes('/test/') ||
    normalizedPath.includes('/tests/')
  ) {
    return { filePath, category: 'test', isNoise: false, noiseReason: null };
  }

  // 8. Source
  return { filePath, category: 'source', isNoise: false, noiseReason: null };
}
