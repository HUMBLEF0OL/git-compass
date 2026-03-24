import { createGitParser, getEnhancedCommits, getBranches, createFilterPipeline } from "../src/parser/index.js";
import {
  analyzeHotspots,
  computeRiskScores,
  analyzeChurn,
  analyzeContributors,
  analyzeBurnout,
  analyzeCoupling,
  analyzeKnowledge,
  analyzeImpact,
  analyzeRot,
  analyzeOwnershipDrift,
  analyzeOnboarding,
  analyzeReviewDebt,
  analyzeDependencyChurn,
  analyzeBranchLifecycles,
  analyzeCommitQuality,
  analyzeVelocity,
  computeSignalIntegrity,
} from "../src/analyzers/index.js";
import type { FileImpact } from "../src/types.js";

import path from "path";

async function runAnalysis() {
  const repoPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

  console.log(`\n=> Analyzing Repository: ${repoPath}`);

  try {
    const git = createGitParser(repoPath);
    
    // 1. Fetch raw data
    const rawCommits = await getEnhancedCommits(git, { maxCount: 200 });
    const branches = await getBranches(git);
    
    console.log(`=> Commits Processed: ${rawCommits.length}`);
    console.log(`=> Branches Processed: ${branches.length}`);

    // 2. Filter pipeline
    const pipeline = createFilterPipeline();
    const cleanCommits = pipeline.filter(rawCommits);
    console.log(`=> Clean Commits: ${cleanCommits.length} (${rawCommits.length - cleanCommits.length} noise removed)`);

    // Transform for P1 compatibility
    const p1Commits = cleanCommits.map((c: any) => ({
      ...c,
      date: new Date(c.date),
      author: c.author.name,
      email: c.author.email,
      diff: c.diff
    })) as any;

    // 3. P0: Signal Quality
    const integrity = computeSignalIntegrity(rawCommits, cleanCommits);

    // 4. P1: Analytics
    const hotspots = analyzeHotspots(p1Commits, "all");
    const risk = computeRiskScores(hotspots);
    const churn = analyzeChurn(p1Commits, "all");
    const contributors = analyzeContributors(p1Commits);
    const burnout = analyzeBurnout(p1Commits);
    const velocity = analyzeVelocity(p1Commits, 7);
    const branchStats = analyzeBranchLifecycles(branches, cleanCommits);
    const quality = analyzeCommitQuality(cleanCommits);

    // 5. P2: Insights
    const coupling = analyzeCoupling(p1Commits);
    const knowledge = analyzeKnowledge(p1Commits);
    const impact = analyzeImpact(p1Commits);
    const rot = analyzeRot(p1Commits);
    
    const activeEmails = cleanCommits.map((c: any) => c.author.email);
    const drift = analyzeOwnershipDrift(cleanCommits, activeEmails);
    const depChurn = analyzeDependencyChurn(cleanCommits);
    const reviewDebt = analyzeReviewDebt(cleanCommits);
    
    const onboarding = analyzeOnboarding(
      cleanCommits,
      { rotFileCount: rot.length, totalFileCount: hotspots.length },
      { siloFileCount: knowledge.length, totalFileCount: hotspots.length },
      { 
        avgBlastRadius: impact.length > 0 ? impact.reduce((acc, i) => acc + i.blastRadius, 0) / impact.length : 0,
        maxBlastRadius: impact.length > 0 ? Math.max(...impact.map(i => i.maxBlastRadius)) : 0
      },
      { avgChurnPerFile: churn.length > 0 ? churn.reduce((acc, c) => acc + c.commitCount, 0) / hotspots.length : 0 }
    );

    console.log("\n=> ANALYSIS SUMMARY");
    console.log("-------------------");
    
    console.log("\n[ Signal Quality ]");
    console.log(`=> Noise Ratio: ${(integrity.noiseRatio * 100).toFixed(1)}%`);
    console.log(`=> Top Noise: ${integrity.topNoiseSources[0]?.reason || 'None'}`);

    console.log("\n[ Core Metrics ]");
    console.log(`=> Hotspots: ${hotspots.length} files`);
    console.log(`=> High Risk Files: ${risk.filter((r) => r.level === "high" || r.level === "critical").length}`);
    console.log(`=> Active Contributors: ${contributors.length}`);
    console.log(`=> Delivery Consistency: ${velocity.teamConsistency.rating}`);
    console.log(`=> Message Quality: ${(quality.goodMessageRatio * 100).toFixed(1)}% good`);

    console.log("\n[ Team & Process ]");
    console.log(`=> Burnout Risk Flags: ${burnout.flags.length}`);
    console.log(`=> Review Coverage: ${(reviewDebt.coverage.coverageRatio * 100).toFixed(1)}%`);
    console.log(`=> Ownership Transitions: ${drift.transitions.filter(t => t.hasTransitioned).length} files`);
    console.log(`=> Abandoned Branches: ${branchStats.filter(b => b.isAbandoned).length}`);

    console.log("\n[ Architecture ]");
    console.log(`=> Knowledge Silos: ${knowledge.length} files`);
    console.log(`=> Temporal Coupling: ${coupling.length} links`);
    console.log(`=> Dependency Drifts: ${depChurn.drifts.length}`);
    console.log(`=> Abandoned (Rot) Files: ${rot.length}`);

    console.log("\n[ Onboarding Score ]");
    console.log(`=> Score: ${onboarding.score.score}/100 (${onboarding.score.rating})`);
    console.log(`=> Weakest Area: ${onboarding.score.weakestArea}`);

    if (knowledge.length > 0) {
      console.log("\n=> TOP KNOWLEDGE SILOS:");
      knowledge.slice(0, 3).forEach((k) => {
        console.log(`  - ${k.path} (${k.mainContributor}: ${k.authorshipPercent}%)`);
      });
    }

    if (onboarding.learningPath.length > 0) {
      console.log("\n=> RECOMMENDED LEARNING PATH:");
      onboarding.learningPath.slice(0, 3).forEach((lp) => {
        console.log(`  ${lp.order}. ${lp.filePath} - ${lp.reason}`);
      });
    }

    console.log("\n=> Entire Core Analysis Successful!\n");
  } catch (error) {
    console.error("\n=> Analysis Failed:");
    console.error(error);
    process.exit(1);
  }
}

runAnalysis();
