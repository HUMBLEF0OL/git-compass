# Git Compass

> A local-first, AI-augmented Git analytics tool for developers.

Git Compass is a modular monorepo designed to help developers and teams understand their codebases through deep Git history analysis.

## Monorepo Packages

- **[@git-compass/cli](./packages/cli)**: The primary command-line interface.
- **[@git-compass/core](./packages/core)**: The functional analytics engine.
- **[tooling](./tooling)**: Shared configurations for ESLint, TypeScript, and Vitest.

## Quick Start

```bash
pnpm install
pnpm build
# Run analysis on the current repo
node packages/cli/dist/bin/git-compass.js analyze
```

For more details, see the [Getting Started guide](./docs/getting-started.md).

