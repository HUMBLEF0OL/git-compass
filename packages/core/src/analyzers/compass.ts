import type { GitCommit } from "../types/signal.js";
import type { CompassReport, CompassEntry, ComponentMaturity } from "../types/extended.js";

/**
 * Maps onboarding file priority based on centrality and developer touchpoints.
 * Also identifies component maturity based on recent churn and activity.
 * Pure function.
 */
export function analyzeCompass(commits: GitCommit[]): CompassReport {
  const componentMap = new Map<string, { lastChanged: string; churn: number }>();
  const fileTouchpoints = new Map<string, Set<string>>();
  const fileChangeCounts = new Map<string, number>();
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Group files into components (top-level directories)
  for (const commit of commits) {
    const commitDate = new Date(commit.date);
    for (const file of commit.files) {
      // Track file change counts
      fileChangeCounts.set(file, (fileChangeCounts.get(file) ?? 0) + 1);

      const parts = file.split("/");
      // Skip hidden files/folders and root files for component mapping
      if (parts[0] && !parts[0].startsWith(".")) {
        const component = parts[0];
        const stats = componentMap.get(component) ?? { lastChanged: commit.date, churn: 0 };

        if (commitDate > new Date(stats.lastChanged)) {
          stats.lastChanged = commit.date;
        }
        if (commitDate > thirtyDaysAgo) {
          stats.churn++;
        }

        componentMap.set(component, stats);
      }

      // Track touchpoints for essentials
      const authors = fileTouchpoints.get(file) ?? new Set<string>();
      authors.add(commit.author.email);
      fileTouchpoints.set(file, authors);
    }
  }

  // Map components to maturity levels
  const components: ComponentMaturity[] = Array.from(componentMap.entries()).map(
    ([name, stats]) => {
      let status: "stable" | "evolving" | "maturing" = "stable";

      if (new Date(stats.lastChanged) < ninetyDaysAgo) {
        status = "maturing"; // Renamed from legacy
      } else if (stats.churn > 20) {
        status = "evolving";
      }

      return { name, status };
    },
  );

  // Identify essential files
  const essentials: CompassEntry[] = Array.from(fileTouchpoints.entries())
    .map(([path, authors]) => ({
      path,
      priority: 1, // Default, can be refined based on depth
      reason: `Touched by ${authors.size} unique contributors`,
      type:
        path.includes("index") || path.includes("main") || path.includes("App")
          ? ("entry-point" as const)
          : ("core" as const),
      changeCount: fileChangeCounts.get(path) ?? 0,
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 5)
    .map((e, index) => ({
      ...e,
      priority: index + 1 // Assign priority based on rank
    }));

  // Re-map to remove internal fields
  const finalEssentials: CompassEntry[] = essentials.map(({ path, priority, reason, type }) => ({
    path, priority, reason, type
  }));

  return { 
    essentials: finalEssentials, 
    components, 
    analyzedAt: new Date().toISOString() 
  };
}

