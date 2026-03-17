import chalk from "chalk";
import boxen from "boxen";
import { table, getBorderCharacters } from "table";
import type { AnalysisResult } from "@git-compass/core";

export function printConsoleReport(result: AnalysisResult, detailLevel: string = "normal", showAI: boolean = false) {
  try {
    const { meta, hotspots, riskScores, contributors, burnout, coupling, knowledge, impact, rot } = result;
    const isVerbose = detailLevel === "verbose";
    const isSummary = detailLevel === "summary";
    const limit = isVerbose ? 10 : 5;

    // 1. Header Summary (Always shown)
    console.log(
      boxen(
        `${chalk.cyan.bold("Git Compass ANALYSIS SUMMARY")}\n` +
        `${chalk.gray("────────────────────────")}\n` +
        `${chalk.white.bold("Repo:   ")} ${chalk.cyan(meta.repoPath)}\n` +
        `${chalk.white.bold("Branch: ")} ${chalk.yellow(meta.branch)}\n` +
        `${chalk.white.bold("Window: ")} ${chalk.magenta(meta.window)}\n` +
        `${chalk.white.bold("Commits:")} ${chalk.green(meta.commitCount)}`,
        { 
          padding: 1, 
          margin: { top: 1, bottom: 1 }, 
          borderStyle: "round", 
          borderColor: "cyan",
          title: "Repository Metadata",
          titleAlignment: "left"
        }
      )
    );

    if (isSummary) {
      printHealthIndicators(impact, rot, !!result.aiSummary);
      return;
    }

    // 2. AI Insights (Intuitive Format)
    if (showAI && result.aiSummary) {
      console.log(
        boxen(
          chalk.white(result.aiSummary.digest) + "\n\n" +
          chalk.gray.italic(`Provider: ${result.aiSummary.provider} | Model: ${result.aiSummary.model}`),
          { 
            padding: 1, 
            margin: { bottom: 1 }, 
            borderStyle: "double", 
            borderColor: "magenta", 
            title: "AI ARCHITECTURAL INSIGHTS", 
            titleAlignment: "center",
            width: 80 // Limit width for better readability of structured text
          }
        )
      );
    }

    // 3. Hotspots Table
    if (hotspots.length > 0) {
      console.log(chalk.yellow.bold("\nTop Hotspots"));
      const hotspotData = [
        [chalk.bold("File"), chalk.bold("Changes"), chalk.bold("Authors"), chalk.bold("Risk Level")]
      ];
      
      hotspots.slice(0, limit).forEach(h => {
        const fileRisk = riskScores.find(r => r.path === h.path);
        const riskLevel = fileRisk?.level || "low";
        const riskColor = getRiskColor(riskLevel);
        
        hotspotData.push([
          chalk.white(h.path),
          chalk.cyan(h.changeCount.toString()),
          chalk.magenta(h.uniqueAuthors.toString()),
          chalk.hex(riskColor).bold(riskLevel.toUpperCase())
        ]);
      });
      console.log(table(hotspotData, {
        border: getBorderCharacters("ramac"),
        header: {
          alignment: 'center',
          content: 'Frequently Edited Files'
        }
      }));
    }

    // 4. High Risk Alert
    const highRisk = riskScores.filter(r => r.level === "high" || r.level === "critical");
    if (highRisk.length > 0) {
      console.log(chalk.red.bold("\nHigh Risk Alert"));
      highRisk.slice(0, isVerbose ? 10 : 3).forEach(r => {
        const color = r.level === "critical" ? chalk.bgRed.white.bold : chalk.red.bold;
        console.log(`  ${color(" " + r.level.toUpperCase() + " ")} ${chalk.white(r.path)} ${chalk.gray("(Score: " + r.score + ")")}`);
      });
    }

    // 5. Contributor Stats
    if (contributors.length > 0) {
      console.log(chalk.green.bold("\nTop Contributors"));
      const contribData = [
        [chalk.bold("Author"), chalk.bold("Commits"), chalk.bold("Activity"), chalk.bold("Status")]
      ];

      contributors.slice(0, limit).forEach(c => {
        const burnoutInfo = burnout.contributors.find(b => b.author === c.author);
        const isBurnedOut = burnoutInfo && (burnoutInfo.afterHoursPercent > 30 || burnoutInfo.weekendPercent > 30);
        
        contribData.push([
          chalk.white(c.author),
          chalk.green(c.commitCount.toString()),
          chalk.cyan(`${c.activeDays} days`),
          isBurnedOut ? chalk.bgRed.white.bold(" BURNOUT ") : chalk.bgGreen.black.bold(" STABLE ")
        ]);
      });
      console.log(table(contribData, { border: getBorderCharacters("ramac") }));
    }

    // 6. Deep Insights (Verbose only)
    if (isVerbose) {
      const insightsData: string[][] = [];
      
      if (coupling.length > 0) {
        insightsData.push([chalk.bold("Temporal Coupling")]);
        coupling.slice(0, 5).forEach(c => {
          insightsData.push([`  ${chalk.white(c.head)} ↔ ${chalk.white(c.tail)}\n  ${chalk.gray("Strength: ")}${chalk.magenta((c.coupling * 100).toFixed(0) + "%")}`]);
        });
      }

      if (knowledge.length > 0) {
        insightsData.push([chalk.bold("Knowledge Silos")]);
        knowledge.slice(0, 5).forEach(k => {
          const color = k.riskLevel === "high" ? chalk.red : k.riskLevel === "medium" ? chalk.yellow : chalk.white;
          insightsData.push([`  ${chalk.white(k.path)}\n  ${chalk.gray("Owner: ")}${color(k.mainContributor)} ${chalk.gray("(" + k.authorshipPercent + "%)")}`]);
        });
      }

      if (insightsData.length > 0) {
        console.log(chalk.blue.bold("\nDeep Architecture Insights"));
        console.log(table(insightsData, { border: getBorderCharacters("ramac") }));
      }
    }

    // 7. Health Indicators & Footer Tip
    printHealthIndicators(impact, rot, showAI);
  } catch (err) {
    console.error(chalk.red("\nError printing report:"), err);
  }
}

function printHealthIndicators(impact: any[], rot: any[], showAI: boolean) {
  const avgImpact = impact.length > 0 ? (impact.reduce((acc: number, i: any) => acc + i.blastRadius, 0) / impact.length).toFixed(2) : 0;
  
  const footerContent = [
    `${chalk.bold("Overall Health Indicators")}`,
    `${chalk.gray("────────────────────────")}`,
    `${chalk.white("Average Blast Radius:  ")} ${chalk.yellow(avgImpact + " files")}`,
    `${chalk.white("Abandoned Files (Rot): ")} ${chalk.red(rot.length)}`
  ];

  if (!showAI) {
    footerContent.push("");
    footerContent.push(`${chalk.gray.italic("Tip: Run 'git-compass config set-ai' to unlock AI-powered insights (use --ai flag).")}`);
  }

  console.log(
    boxen(
      footerContent.join("\n"),
      { 
        padding: 1, 
        margin: { top: 1, bottom: 1 }, 
        borderStyle: "round", 
        borderColor: "gray" 
      }
    )
  );
}

function getRiskColor(level: string): string {
  switch (level) {
    case "critical": return "#FF0000";
    case "high": return "#FF4500";
    case "medium": return "#FFA500";
    default: return "#00FF00";
  }
}







