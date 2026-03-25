import type { GitCommit } from "../types/signal.js";
import type { BurnoutReport, BurnoutContributor } from "../types/extended.js";

/**
 * Detects burnout risk patterns based on commit times and intensity.
 * Pure function.
 */
export function analyzeBurnout(commits: GitCommit[]): BurnoutReport {
  let totalAfterHours = 0;
  let totalWeekend = 0;
  
  const authorCommits = new Map<string, { name: string, commits: GitCommit[] }>();

  for (const commit of commits) {
    const date = new Date(commit.date);
    const hours = date.getHours();
    const day = date.getDay();
    const isAfterHours = hours >= 22 || hours <= 6;
    const isWeekend = day === 0 || day === 6;

    if (isAfterHours) totalAfterHours++;
    if (isWeekend) totalWeekend++;

    const existing = authorCommits.get(commit.author.email) ?? { name: commit.author.name, commits: [] };
    existing.commits.push(commit);
    authorCommits.set(commit.author.email, existing);
  }

  const contributors: BurnoutContributor[] = Array.from(authorCommits.entries()).map(
    ([email, data]) => {
      const history = data.commits;
      const afterHoursCount = history.filter((c) => {
        const h = new Date(c.date).getHours();
        return h >= 22 || h <= 6;
      }).length;

      const weekendCount = history.filter((c) => {
        const d = new Date(c.date).getDay();
        return d === 0 || d === 6;
      }).length;

      const afterHoursRatio = history.length === 0 ? 0 : afterHoursCount / history.length;
      const weekendRatio = history.length === 0 ? 0 : weekendCount / history.length;

      const riskLevel: BurnoutContributor["riskLevel"] =
        afterHoursRatio > 0.4 || weekendRatio > 0.4
          ? "high"
          : afterHoursRatio > 0.2 || weekendRatio > 0.2
            ? "medium"
            : "low";

      return {
        email,
        name: data.name,
        afterHoursRatio,
        weekendRatio,
        riskLevel,
      };
    },
  );

  return {
    contributors,
    totalAfterHoursCommits: totalAfterHours,
    totalWeekendCommits: totalWeekend,
    analyzedAt: new Date().toISOString(),
  };
}

