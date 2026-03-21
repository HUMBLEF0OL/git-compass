import { describe, it, expect, vi } from "vitest";
import { printConsoleReport } from "../console.js";
import chalk from "chalk";

describe("Console Formatter", () => {
  const mockResult = {
    meta: {
      repoPath: "/test/repo",
      branch: "master",
      window: "30d",
      commitCount: 10,
      generatedAt: new Date()
    },
    hotspots: [],
    riskScores: [],
    churn: [],
    contributors: [],
    burnout: [],
    coupling: [],
    knowledge: [],
    impact: [],
    rot: [],
    health: {
      stability: 80,
      velocity: 70,
      simplicity: 90,
      coverage: 60,
      decoupling: 85
    },
    compass: {
      essentials: [
        { path: "src/index.ts", priority: 1, reason: "Entry point", changeCount: 10, type: "entry-point" }
      ],
      components: [],
      documentation: "Test docs"
    }
  };

  it("should output basic report structure", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    printConsoleReport(mockResult as any, "summary", false);
    
    expect(logSpy).toHaveBeenCalled();
    const calls = logSpy.mock.calls.map(call => call[0]);
    // console.log("DEBUG CALLS:", JSON.stringify(calls)); // Temporarily uncomment if needed
    
    expect(calls.some(c => c && c.toLowerCase().includes("analysis"))).toBe(true);
    
    logSpy.mockRestore();
  });

  it("should indicate AI summary presence", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const aiResult = { ...mockResult, aiSummary: { digest: "AI summary here", provider: "test", model: "test" } };
    
    printConsoleReport(aiResult as any, "normal", true);
    
    const calls = logSpy.mock.calls.map(call => call[0]);
    expect(calls.some(c => c && c.toLowerCase().includes("ai"))).toBe(true);
    
    logSpy.mockRestore();
  });
});







