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
  generateSummary,
} from "@git-compass/core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoPath = searchParams.get("repoPath") || process.env.GIT_COMPASS_CWD || "../../";
  const branch = searchParams.get("branch") || "HEAD";
  const window = (searchParams.get("window") as any) || "30d";
  const maxCommits = parseInt(searchParams.get("maxCommits") || "500", 10);
  const ai = searchParams.get("ai") === "true";
  const aiProvider = searchParams.get("aiProvider") || "openai";
  const aiApiKey = searchParams.get("aiApiKey") || "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ stage: "starting", message: "Initializing analysis..." });

        const parser = createGitParser(repoPath);
        const isValid = await isValidRepo(parser);

        if (!isValid) {
          send({ error: "Not a valid Git repository at " + repoPath });
          controller.close();
          return;
        }

        send({ stage: "commits", message: "Fetching commits..." });
        const commits = await getCommits(parser, { branch, window, maxCount: maxCommits });

        send({ stage: "hotspots", message: "Analyzing hotspots and risk..." });
        const hotspots = analyzeHotspots(commits, window as any);
        const riskScores = computeRiskScores(hotspots);
        const hotspotsWithScores = hotspots.map((h) => {
          const rs = riskScores.find((s) => s.path === h.path);
          return { ...h, riskScore: rs?.score ?? 0, riskLevel: rs?.level ?? "low" };
        });

        send({ stage: "churn", message: "Analyzing churn and contributors..." });
        const churn = analyzeChurn(commits, window as any);
        const contributors = analyzeContributors(commits);
        const contributorTimeline = analyzeContributorTimeline(commits);

        send({ stage: "advanced", message: "Performing advanced analysis..." });
        const burnout = analyzeBurnout(commits);
        const coupling = analyzeCoupling(commits);
        const knowledge = analyzeKnowledge(commits);
        const impact = analyzeImpact(commits);
        const rot = analyzeRot(commits);
        const compass = analyzeCompass(commits);
        const health = analyzeHealth(commits, churn, coupling);

        const analysisResult = {
          meta: { repoPath, branch, window, commitCount: commits.length, generatedAt: new Date() },
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

        if (ai && (aiApiKey || process.env.OPENAI_API_KEY)) {
          send({ stage: "ai", message: "Generating AI summary..." });
          try {
            const finalApiKey = aiApiKey || process.env.OPENAI_API_KEY;
            const providerType =
              aiProvider === "anthropic"
                ? AIProviderType.ANTHROPIC
                : aiProvider === "google"
                  ? AIProviderType.GEMINI
                  : AIProviderType.OPENAI;
            const provider = getAIProvider(providerType, finalApiKey!);
            const result = await generateSummary(provider, analysisResult as any);
            (analysisResult as any).aiSummary = result.digest;
          } catch (e) {
            console.error("AI summarization failed:", e);
          }
        }

        send({ stage: "complete", data: analysisResult });
        controller.close();
      } catch (err: any) {
        console.error(err);
        send({ error: err.message || "Analysis failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
