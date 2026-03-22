import type { RawCommit, CompassEntry, CompassResult, ComponentMaturity } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";

/**
 * Maps onboarding file priority based on centrality and developer touchpoints.
 */
/**
 * Maps onboarding file priority based on centrality and developer touchpoints.
 * Also identifies component maturity based on recent churn and activity.
 */
export function analyzeCompass(commits: RawCommit[], excludePatterns?: string[]): CompassResult {
  const componentMap = new Map<string, { lastChanged: Date; churn: number }>();
  const fileTouchpoints = new Map<string, Set<string>>();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Group files into components (top-level directories)
  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff, excludePatterns);
    for (const file of files) {
      const parts = file.split("/");
      // Skip hidden files/folders and root files for component mapping
      if (parts[0] && !parts[0].startsWith(".")) {
        const component = parts[0];
        const stats = componentMap.get(component) ?? { lastChanged: commit.date, churn: 0 };

        if (commit.date > stats.lastChanged) stats.lastChanged = commit.date;
        if (commit.date > thirtyDaysAgo) stats.churn++;

        componentMap.set(component, stats);
      }

      // Track touchpoints for essentials
      const authors = fileTouchpoints.get(file) ?? new Set<string>();
      authors.add(commit.author);
      fileTouchpoints.set(file, authors);
    }
  }

  // Map components to maturity levels
  const components: ComponentMaturity[] = Array.from(componentMap.entries()).map(
    ([name, stats]) => {
      let maturity: "Stable" | "Evolving" | "Legacy" = "Stable";

      if (stats.lastChanged < ninetyDaysAgo) {
        maturity = "Legacy";
      } else if (stats.churn > 20) {
        maturity = "Evolving";
      }

      return { name, maturity };
    },
  );

  // Identify essential files
  const essentials: CompassEntry[] = Array.from(fileTouchpoints.entries())
    .map(([path, authors]) => ({
      path,
      priority: 1,
      reason: `Touched by ${authors.size} unique contributors`,
      changeCount: commits.filter((c) =>
        extractFilesFromDiff(c.diff, excludePatterns).includes(path),
      ).length,
      type:
        path.includes("index") || path.includes("main") || path.includes("App")
          ? ("entry-point" as const)
          : ("core" as const),
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 5);

  const mainComponents = components.filter((c) => c.maturity === "Stable").map((c) => c.name);

  const documentation =
    mainComponents.length > 0
      ? `The codebase is primarily built around the ${mainComponents.join(", ")} components. For onboarding, focus on the identified essential files which represent the most active and central parts of the architecture.`
      : `This repository is currently in an evolving state. Focus on the hotspots and high-risk files to understand the current areas of active development and potential technical debt.`;

  return { essentials, components, documentation };
}
