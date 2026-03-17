# Getting Started with Git Compass Development

Welcome to the Git Compass developer community! This guide will help you set up your local environment and start contributing.

## Prerequisites

- **Node.js**: v18.0.0 or higher.
- **pnpm**: We use pnpm for monorepo and workspace management.
- **Git**: Essential for analysis testing.

## Step 1: Clone and Install

```bash
git clone https://github.com/git-compass/Git Compass.git
cd Git Compass
pnpm install
```

## Step 2: Build the Project

Before running the CLI or tests, build all packages:

```bash
pnpm run build
```

## Step 3: Local Testing

To test the CLI against a local repository:

```bash
cd packages/cli
npx tsx src/bin/git-compass.ts analyze -p /path/to/some/repo
```

## Step 4: Development Workflow

To have your changes automatically recompiled during development:

```bash
pnpm dev
```

This runs `tsc --watch` across all workspaces.

## Step 5: Running Tests

We use Vitest for our test suite.

```bash
# Run all tests
pnpm run test

# Run tests for a specific package
cd packages/core
npm test
```

## Troubleshooting

### Missing Dependencies
If you see errors about missing modules, ensure you've run `pnpm install` at the root.

### `tsx` Not Found
If `npx tsx` fails, ensure you are in the `packages/cli` directory or that the dependency has been installed globally.

---
Need help? Open an issue or reach out to the maintainers!


