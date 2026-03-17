import type { RawCommit, BurnoutAnalysis, BurnoutContributor } from "../types.js";

/**
 * Detects burnout risk patterns based on commit times and intensity.
 */
export function analyzeBurnout(commits: RawCommit[]): BurnoutAnalysis {
  let globalAfterHours = 0;
  let globalWeekend = 0;
  const authorCommits = new Map<string, RawCommit[]>();

  for (const commit of commits) {
    const hours = commit.date.getHours();
    const day = commit.date.getDay();
    const isAfterHours = hours >= 22 || hours <= 6;
    const isWeekend = day === 0 || day === 6;

    if (isAfterHours) globalAfterHours++;
    if (isWeekend) globalWeekend++;

    const existing = authorCommits.get(commit.author) ?? [];
    existing.push(commit);
    authorCommits.set(commit.author, existing);
  }

  const contributors: BurnoutContributor[] = Array.from(authorCommits.entries()).map(
    ([author, history]) => {
      const afterHours = history.filter((c) => {
        const h = c.date.getHours();
        return h >= 22 || h <= 6;
      }).length;

      const weekend = history.filter((c) => {
        const d = c.date.getDay();
        return d === 0 || d === 6;
      }).length;

      const afterHoursPercent = Math.round((afterHours / history.length) * 100);
      const weekendPercent = Math.round((weekend / history.length) * 100);

      const riskLevel: BurnoutContributor["riskLevel"] =
        afterHoursPercent > 40 || weekendPercent > 40
          ? "high"
          : afterHoursPercent > 20 || weekendPercent > 20
            ? "medium"
            : "low";

      return {
        author,
        afterHoursPercent,
        weekendPercent,
        riskLevel,
      };
    },
  );

  const flags = contributors
    .filter((c) => c.riskLevel !== "low")
    .map((c) => `${c.author} is at ${c.riskLevel} burnout risk`);

  return {
    flags,
    afterHoursCommits: globalAfterHours,
    weekendCommits: globalWeekend,
    contributors,
  };
}














