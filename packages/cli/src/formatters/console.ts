import chalk from "chalk";
import boxen from "boxen";
import { table, getBorderCharacters } from "table";
import type { AnalysisResult } from "@git-compass/core";
import { HEALTH_THRESHOLDS } from "../constants/index.js";

export function printConsoleReport(
  result: AnalysisResult,
  detailLevel: string = "normal",
  showAI: boolean = false,
) {
  try {
    const {
      meta,
      hotspots: hotspotReport,
      risk,
      burnout,
      compass,
      velocity,
      insights,
      health,
      contributors: contributorReport,
    } = result;
    
    const hotspots = hotspotReport.hotspots;
    const riskScores = risk.fileRisks;
    const contributors = contributorReport.contributors;

    const isVerbose = detailLevel === "verbose";
    const isSummary = detailLevel === "summary";
    const limit = isVerbose ? 10 : 5;

    // 1. Header Summary (Always shown)
    const healthScore = health.overallHealth;
    const healthColor =
      healthScore > HEALTH_THRESHOLDS.GOOD
        ? chalk.green
        : healthScore > HEALTH_THRESHOLDS.WARNING
          ? chalk.yellow
          : chalk.red;

    console.log(
      boxen(
        `${chalk.cyan.bold("Git Compass ANALYSIS SUMMARY")}\n` +
          `${chalk.gray("────────────────────────")}\n` +
          `${chalk.white.bold("Repo:   ")} ${chalk.cyan(meta.repoPath)}\n` +
          `${chalk.white.bold("Branch: ")} ${chalk.yellow(meta.branch)}\n` +
          `${chalk.white.bold("Window: ")} ${chalk.magenta(meta.windowDays + " days")}\n` +
          `${chalk.white.bold("Commits:")} ${chalk.green(meta.commitCount)}\n` +
          `${chalk.white.bold("Health: ")} ${healthColor.bold(healthScore + "%")}`,
        {
          padding: 1,
          margin: { top: 1, bottom: 0 },
          borderStyle: "round",
          borderColor: "cyan",
          title: "Repository Metadata",
          titleAlignment: "left",
        },
      ),
    );

    // 2. Onboarding Compass (New)
    if (compass && (isVerbose || !isSummary)) {
      const compassContent = [
        chalk.white.bold("Essential Files:"),
        ...compass.essentials.map(
          (e: any) =>
            `  ${chalk.cyan(e.path.padEnd(30))} ${chalk.gray("│")} ${chalk.yellow(e.type.toUpperCase().padEnd(12))} ${chalk.gray("│")} ${chalk.magenta(e.priority + " priority")}`,
        ),
        "",
        chalk.white.bold("Maturity:"),
        ...compass.components.map((c: any) => `  ${chalk.white(c.name)}: ${chalk.gray(c.status)}`),
      ].join("\n");

      console.log(
        boxen(compassContent, {
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: "round",
          borderColor: "blue",
          title: "ONBOARDING COMPASS",
          titleAlignment: "left",
        }),
      );
    }

    if (isSummary) {
      printHealthIndicators(health, [], [], insights.dependencyChurn.couplings, !!(result as any).aiSummary);
      return;
    }

    // 3. AI Insights (Intuitive Format)
    if (showAI && (result as any).aiSummary) {
      const aiSummary = (result as any).aiSummary;
      console.log(
        boxen(
          chalk.white(aiSummary.digest) +
            "\n\n" +
            chalk.gray.italic(
              `Provider: ${aiSummary.provider} | Model: ${aiSummary.model}`,
            ),
          {
            padding: 1,
            margin: { bottom: 1 },
            borderStyle: "double",
            borderColor: "magenta",
            title: "AI ARCHITECTURAL INSIGHTS",
            titleAlignment: "center",
            width: 80, // Limit width for better readability of structured text
          },
        ),
      );
    }

    // 3. Hotspots Table
    if (hotspots.length > 0) {
      console.log(chalk.yellow.bold("\nTop Hotspots"));
      const hotspotData = [
        [
          chalk.bold("File"),
          chalk.bold("Changes"),
          chalk.bold("Authors"),
          chalk.bold("Risk Level"),
        ],
      ];

      hotspots.slice(0, limit).forEach((h) => {
        const fileRisk = riskScores.find((r) => r.path === h.path);
        const riskLevel = fileRisk?.level || "low";
        const riskColor = getRiskColor(riskLevel);

        // Explanatory factors
        const factors = fileRisk?.factors
          ? `(${chalk.gray(`freq:${fileRisk.factors.frequency},auth:${fileRisk.factors.authors},rec:${fileRisk.factors.recency}`)})`
          : "";

        hotspotData.push([
          chalk.white(h.path) + (factors ? "\n" + factors : ""),
          chalk.cyan(h.changeCount.toString()),
          chalk.magenta(h.uniqueAuthors.toString()),
          chalk.hex(riskColor).bold(riskLevel.toUpperCase()),
        ]);
      });
      console.log(
        table(hotspotData, {
          border: getBorderCharacters("ramac"),
          header: {
            alignment: "center",
            content: "Frequently Edited Files",
          },
        }),
      );
    }

    // 4. High Risk Alert
    const highRisk = riskScores.filter((r) => r.level === "high" || r.level === "critical");
    if (highRisk.length > 0) {
      console.log(chalk.red.bold("\nHigh Risk Alert"));
      highRisk.slice(0, isVerbose ? 10 : 3).forEach((r) => {
        const color = r.level === "critical" ? chalk.bgRed.white.bold : chalk.red.bold;
        console.log(
          `  ${color(" " + r.level.toUpperCase() + " ")} ${chalk.white(r.path)} ${chalk.gray("(Score: " + r.score + ")")}`,
        );
      });
    }

    // 5. Contributor Stats
    if (contributors.length > 0) {
      console.log(chalk.green.bold("\nTop Contributors"));
      const contribData = [
        [chalk.bold("Author"), chalk.bold("Commits"), chalk.bold("Activity"), chalk.bold("Status")],
      ];

      contributors.slice(0, limit).forEach((c) => {
        const burnoutInfo = burnout.contributors.find((b) => b.email === c.email);
        const isBurnedOut =
          burnoutInfo && (burnoutInfo.riskLevel === 'high');

        contribData.push([
          chalk.white(c.name),
          chalk.green(c.commitCount.toString()),
          chalk.cyan(`${c.activeDays} days`),
          isBurnedOut ? chalk.bgRed.white.bold(" BURNOUT ") : chalk.bgGreen.black.bold(" STABLE "),
        ]);
      });
      console.log(table(contribData, { border: getBorderCharacters("ramac") }));
    }

    // 6. Deep Insights (Verbose only)
    if (isVerbose) {
      const insightsData: string[][] = [];

      const coupling = insights.dependencyChurn.couplings;
      if (coupling.length > 0) {
        insightsData.push([chalk.bold("Temporal Coupling")]);
        coupling.slice(0, 5).forEach((c) => {
          insightsData.push([
            `  ${chalk.white(c.fileA)} ↔ ${chalk.white(c.fileB)}\n  ${chalk.gray("Strength: ")}${chalk.magenta((c.couplingScore * 100).toFixed(0) + "%")}`,
          ]);
        });
      }

      const knowledge = insights.ownershipDrift.transitions;
      if (knowledge && knowledge.length > 0) {
        insightsData.push([chalk.bold("Knowledge Silos")]);
        knowledge
          .filter(t => t.periods.length > 0 && t.periods[t.periods.length - 1]!.ownershipShare > 0.8)
          .slice(0, 5)
          .forEach((k) => {
            const latest = k.periods[k.periods.length - 1]!;
            insightsData.push([
              `  ${chalk.white(k.filePath)}\n  ${chalk.gray("Owner: ")}${chalk.red(latest.ownerEmail)} ${chalk.gray("(" + (latest.ownershipShare * 100).toFixed(0) + "%)")}`,
            ]);
          });
      }

      if (insightsData.length > 0) {
        console.log(chalk.blue.bold("\nDeep Architecture Insights"));
        console.log(table(insightsData, { border: getBorderCharacters("ramac") }));
      }
    }

    // 7. Health Indicators & Footer Tip
    printHealthIndicators(health, [], [], insights.dependencyChurn.couplings, showAI);
  } catch (err) {
    console.error(chalk.red("\nError printing report:"), err);
  }
}

function printHealthIndicators(health: any, impact: any[], rot: any[], churn: any[], showAI: boolean) {
  const footerContent = [
    `${chalk.bold("Overall Health Indicators")}`,
    `${chalk.gray("────────────────────────")}`,
    `${chalk.white("Stability:   ")} ${chalk.cyan(health.stability + "%")}`,
    `${chalk.white("Velocity:    ")} ${chalk.cyan(health.velocity + "%")}`,
    `${chalk.white("Complexity:  ")} ${chalk.cyan(health.simplicity + "%")}`,
    `${chalk.white("Coverage:    ")} ${chalk.cyan(health.coverage + "%")}`,
    `${chalk.white("Decoupling:  ")} ${chalk.cyan(health.decoupling + "%")}`,
  ];

  // Churn trend summary
  if (churn && churn.length > 0) {
    const sortedChurn = [...churn].sort(
      (a: any, b: any) => b.linesAdded + b.linesRemoved - (a.linesAdded + a.linesRemoved),
    );
    const peak = sortedChurn[0];
    const peakDate = new Date(peak.date).toLocaleDateString();
    footerContent.splice(
      2,
      0,
      `${chalk.white("Peak Churn:  ")} ${chalk.magenta(peakDate)} ${chalk.gray(`(${peak.linesAdded + peak.linesRemoved} lines)`)}`,
    );
  }

  if (!showAI) {
    footerContent.push("");
    footerContent.push(
      `${chalk.gray.italic("Tip: Run 'git-compass config set-ai' to unlock AI-powered insights (use --ai flag).")}`,
    );
  }

  console.log(
    boxen(footerContent.join("\n"), {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "gray",
    }),
  );
}

function getRiskColor(level: string): string {
  switch (level) {
    case "critical":
      return "#FF0000";
    case "high":
      return "#FF4500";
    case "medium":
      return "#FFA500";
    default:
      return "#00FF00";
  }
}
