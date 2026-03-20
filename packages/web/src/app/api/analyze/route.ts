import { NextRequest, NextResponse } from "next/server";
import { 
  createGitParser, 
  isValidRepo,
  getCommits,
  analyzeHotspots, 
  computeRiskScores, 
  analyzeChurn, 
  analyzeContributors, 
  analyzeContributorTimeline,
  analyzeBurnout,
  analyzeCoupling,
  analyzeImpact,
  analyzeRot,
  analyzeKnowledge,
  analyzeCompass,
  analyzeHealth,
  getAIProvider,
  AIProviderType,
  generateSummary
} from "@git-compass/core";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Default to project root relative to execution context
    const { 
      repoPath = "../../", 
      branch = "HEAD", 
      window = "30d", 
      maxCommits = 500, 
      ai = true,
      aiProvider = "openai",
      aiApiKey = ""
    } = body;

    const parser = createGitParser(repoPath);
    const isValid = await isValidRepo(parser);

    if (!isValid) {
      return NextResponse.json({ error: "Not a valid Git repository at " + repoPath }, { status: 400 });
    }

    const commits = await getCommits(parser, { branch, window, maxCount: maxCommits });
    
    // Run all analyzers
    const hotspots = analyzeHotspots(commits, window as any);
    const riskScores = computeRiskScores(hotspots);
    
    // Merge risk scores back into hotspots for UI consumption
    const hotspotsWithScores = hotspots.map(h => {
      const rs = riskScores.find(s => s.path === h.path);
      return { 
        ...h, 
        riskScore: rs?.score ?? 0,
        riskLevel: rs?.level ?? "low"
      };
    });

    const churn = analyzeChurn(commits, window as any);
    const contributors = analyzeContributors(commits);
    const contributorTimeline = analyzeContributorTimeline(commits);
    const burnout = analyzeBurnout(commits);
    const coupling = analyzeCoupling(commits);
    const knowledge = analyzeKnowledge(commits);
    const impact = analyzeImpact(commits);
    const rot = analyzeRot(commits);
    const compass = analyzeCompass(commits);
    const health = analyzeHealth(commits, churn, coupling);

    const analysisResult = {
      meta: { 
        repoPath, 
        branch, 
        window, 
        commitCount: commits.length, 
        generatedAt: new Date() 
      },
      hotspots: hotspotsWithScores,
      riskScores,
      churn,
      contributors,
      contributorTimeline,
      burnout,
      coupling,
      knowledge,
      impact,
      rot,
      compass,
      health,
    };

    let aiSummary = null;
    const finalApiKey = aiApiKey || process.env.OPENAI_API_KEY;
    if (ai && finalApiKey) {
        try {
            const providerType = aiProvider === "anthropic" ? AIProviderType.ANTHROPIC : 
                               aiProvider === "google" ? AIProviderType.GEMINI : 
                               AIProviderType.OPENAI;
            const provider = getAIProvider(providerType, finalApiKey);
            const result = await generateSummary(provider, analysisResult as any);
            aiSummary = result.digest;
        } catch (e) {
            console.error("AI summarization failed:", e);
        }
    }

    return NextResponse.json({
      ...analysisResult,
      aiSummary
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}
