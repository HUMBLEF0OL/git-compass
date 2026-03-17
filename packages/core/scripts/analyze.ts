import { createGitParser, getCommits } from "../src/parser/index.js";
import {
  analyzeHotspots,
  computeRiskScores,
  analyzeChurn,
  analyzeContributors,
  analyzeBurnout,
  analyzeCoupling,
  analyzeKnowledge,
  analyzeImpact,
  analyzeRot
} from "../src/analyzers/index.js";
import type { FileImpact } from "../src/types.js";

import path from "path";

async function runAnalysis() {
  const repoPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

  console.log(`\n=> Analyzing Repository: ${repoPath}`);

  try {
    const git = createGitParser(repoPath);
    const commits = await getCommits(git, { maxCount: 100 });

    console.log(`=> Commits Processed: ${commits.length}`);

    const hotspots = analyzeHotspots(commits, "all");
    const risk = computeRiskScores(hotspots);
    const churn = analyzeChurn(commits, "all");
    const contributors = analyzeContributors(commits);
    const burnout = analyzeBurnout(commits);
    const coupling = analyzeCoupling(commits);
    const knowledge = analyzeKnowledge(commits);
    const impact = analyzeImpact(commits);
    const rot = analyzeRot(commits);

    console.log("\n=> ANALYSIS SUMMARY");
    console.log("-------------------");
    console.log(`=> Hotspots: ${hotspots.length} files`);
    console.log(`=> High Risk Files: ${risk.filter(r => r.level === 'high' || r.level === 'critical').length}`);
    console.log(`=> Total Churn Days: ${churn.length}`);
    console.log(`=> Contributors: ${contributors.length}`);
    console.log(`=> Burnout Flags: ${burnout.flags.length}`);
    console.log(`=> Temporal Coupling: ${coupling.length} strong links`);
    console.log(`=> Knowledge Silos: ${knowledge.length} files`);
    console.log(`=> Avg Blast Radius: ${impact.length > 0 ? (impact.reduce((acc: number, i: FileImpact) => acc + i.blastRadius, 0) / impact.length).toFixed(2) : 0} files`);
    console.log(`=> Abandoned Files (Rot): ${rot.length}`);



    if (coupling.length > 0) {
      console.log("\n=> TOP TEMPORAL COUPLING:");
      coupling.slice(0, 5).forEach(c => {
        console.log(`  - ${c.head} <-> ${c.tail} (${(c.coupling * 100).toFixed(0)}% coupling)`);
      });
    }

    if (knowledge.length > 0) {
      console.log("\n=> KNOWLEDGE SILOS:");
      knowledge.slice(0, 5).forEach(k => {
        console.log(`  - ${k.path} (${k.mainContributor}: ${k.authorshipPercent}%)`);
      });
    }

    console.log("\n=> Core Analysis Successful!\n");
  } catch (error) {
    console.error("\n=> Analysis Failed:");
    console.error(error);
    process.exit(1);
  }
}

runAnalysis();














