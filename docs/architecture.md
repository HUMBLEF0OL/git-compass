# Git Compass Architecture

Git Compass is designed as a modular monorepo, separating core analysis logic from consumer interfaces.

## High-Level Architecture

```mermaid
graph TD
    User([User])
    CLI[git-compass]
    Core[@git-compass/core]
    Git[(Git Repository)]
    AI[Anthropic API]

    User --> CLI
    CLI --> Core
    Core --> Git
    CLI -.-> AI
    Core -.-> AI
```

## Packages

### 1. `@git-compass/core`
The "brain" of the project. It handles all raw data processing and insight generation.
- **Git Parser**: Leverages `simple-git` to extract commit history, diffs, and metadata.
- **Analyzers**: Pure functions that compute metrics like hotspots, churn, and temporal coupling.
- **AI Clients**: Interfaces for interacting with LLMs to generate summaries and answer queries.

### 2. `git-compass`
The primary user interface. Built with `commander`.
- **Commands**: `analyze`, `watch`, `query`, and `config`.
- **Formatters**: Converts core `AnalysisResult` data into human-readable console output, JSON, or HTML.
- **State Management**: Uses `conf` to store persistent configurations like API keys.

## Data Flow (Analysis Phase)

1. **Input**: CLI receives a path and a branch.
2. **Parsing**: `@git-compass/core` fetches raw commit data from the `.git` directory.
3. **Analysis**: Data is passed through multiple analyzers concurrently.
4. **AI Layer (Optional)**: If requested, results are sent to an LLM for structured insight generation.
5. **Output**: CLI formats and prints the final report to the user's terminal or designated file.

## Design Principles

- **Separation of Concerns**: UI logic stays in `cli`, while business logic stays in `core`.
- **Pure Functions**: Most analyzers are pure, making them easy to test and reason about.
- **Plug-and-Play**: The AI client is designed to be swappable, supporting different models or providers in the future.


