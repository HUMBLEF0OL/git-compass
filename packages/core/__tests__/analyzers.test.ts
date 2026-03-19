import { describe, it, expect } from "vitest";
import { analyzeHotspots } from "../src/analyzers/hotspot.js";
import { computeRiskScores } from "../src/analyzers/risk.js";
import { analyzeChurn } from "../src/analyzers/churn.js";
import { analyzeContributors } from "../src/analyzers/contributor.js";
import { analyzeBurnout } from "../src/analyzers/burnout.js";
import { analyzeCoupling } from "../src/analyzers/coupling.js";
import { analyzeKnowledge } from "../src/analyzers/knowledge.js";
import { analyzeImpact } from "../src/analyzers/impact.js";
import { analyzeRot } from "../src/analyzers/rot.js";
import type { RawCommit } from "../src/types.js";


// Use fixed dates for deterministic testing
const jan1 = new Date("2024-01-01T10:00:00Z"); // Monday
const jan2 = new Date("2024-01-02T10:00:00Z"); // Tuesday
const jan3 = new Date("2024-01-03T23:00:00Z"); // Wednesday (after hours)
const jan4 = new Date("2024-01-04T10:00:00Z"); // Thursday
const jan5 = new Date("2024-01-05T10:00:00Z"); // Friday
const jan6 = new Date("2024-01-06T10:00:00Z"); // Saturday (weekend)

const mockCommits: RawCommit[] = [
  {
    hash: "c0",
    author: "Alice",
    email: "alice@example.com",
    date: jan1,
    message: "init: old commit",
    body: "",
    diff: {
      insertions: 100,
      deletions: 0,
      files: [{ file: "INIT.md" }],
    },
  },
  {
    hash: "c1",
    author: "Alice",
    email: "alice@example.com",
    date: jan2,
    message: "feat: core logic",
    body: "",
    diff: {
      insertions: 50,
      deletions: 10,
      files: [{ file: "src/index.ts" }, { file: "src/utils.ts" }],
    },
  },
  {
    hash: "c2",
    author: "Bob",
    email: "bob@example.com",
    date: jan3, // After hours
    message: "fix: bug in index",
    body: "",
    diff: {
      insertions: 5,
      deletions: 2,
      files: [{ file: "src/index.ts" }],
    },
  },
  {
    hash: "c3",
    author: "Alice",
    email: "alice@example.com",
    date: jan6, // Weekend
    message: "docs: update readme",
    body: "",
    diff: {
      insertions: 10,
      deletions: 0,
      files: [{ file: "README.md" }],
    },
  },
  {
    hash: "c4",
    author: "Alice",
    email: "alice@example.com",
    date: jan6,
    message: "feat: coupling boost",
    body: "",
    diff: {
      insertions: 1,
      deletions: 0,
      files: [{ file: "src/index.ts" }, { file: "src/utils.ts" }],
    },
  },
  {
    hash: "c5",
    author: "Alice",
    email: "alice@example.com",
    date: jan2,
    message: "silo: 1",
    body: "",
    diff: { files: [{ file: "src/index.ts" }] },
  },
  {
    hash: "c6",
    author: "Alice",
    email: "alice@example.com",
    date: jan2,
    message: "silo: 2",
    body: "",
    diff: { files: [{ file: "src/index.ts" }] },
  },
  {
    hash: "c7",
    author: "Alice",
    email: "alice@example.com",
    date: jan2,
    message: "silo: 3",
    body: "",
    diff: { files: [{ file: "src/index.ts" }] },
  },
];


describe("Analyzers", () => {
  it("should analyze hotspots correctly", () => {
    const hotspots = analyzeHotspots(mockCommits, "all");
    expect(hotspots).toHaveLength(4);
    expect(hotspots.find((h) => h.path === "src/index.ts")?.changeCount).toBe(6);
    expect(hotspots.find((h) => h.path === "INIT.md")).toBeDefined();
  });


  it("should compute risk scores correctly", () => {
    const hotspots = analyzeHotspots(mockCommits, "all");
    const riskScores = computeRiskScores(hotspots);
    expect(riskScores).toHaveLength(4);
    const indexRisk = riskScores.find((r) => r.path === "src/index.ts");
    expect(indexRisk?.score).toBeGreaterThan(0);
    expect(indexRisk?.level).toBeDefined();
  });

  it("should analyze churn correctly", () => {
    const churn = analyzeChurn(mockCommits, "all");
    expect(churn).toHaveLength(4);
  });

  it("should analyze contributors correctly", () => {
    const contributors = analyzeContributors(mockCommits);
    expect(contributors).toHaveLength(2);
    const alice = contributors.find((c) => c.author === "Alice");
    expect(alice?.commitCount).toBe(7);
    expect(alice?.filesChanged).toBe(4); // INIT.md, src/index.ts, src/utils.ts, README.md
    expect(alice?.activeDays).toBe(3);
  });


  it("should analyze burnout correctly", () => {
    const burnout = analyzeBurnout(mockCommits);
    expect(burnout.afterHoursCommits).toBe(1); // Bob's commit c2
    expect(burnout.weekendCommits).toBe(2); // Alice's commits c3, c4
    const bob = burnout.contributors.find((c) => c.author === "Bob");
    expect(bob?.afterHoursPercent).toBe(100);
  });


  it("should analyze coupling correctly", () => {
    const coupling = analyzeCoupling(mockCommits);
    const link = coupling.find(l =>
      (l.head === "src/index.ts" && l.tail === "src/utils.ts") ||
      (l.head === "src/utils.ts" && l.tail === "src/index.ts")
    );

    expect(link).toBeDefined();
    expect(link?.coupling).toBeGreaterThan(0.3);
  });

  it("should analyze knowledge distribution correctly", () => {
    const knowledge = analyzeKnowledge(mockCommits);
    const silo = knowledge.find(k => k.path === "src/index.ts");
    expect(silo).toBeDefined();
    expect(silo?.mainContributor).toBe("Alice");
    expect(silo?.authorshipPercent).toBeGreaterThan(80);
  });

  it("should analyze blast radius correctly", () => {
    const impact = analyzeImpact(mockCommits);
    const indexImpact = impact.find(i => i.path === "src/index.ts");
    expect(indexImpact).toBeDefined();
    expect(indexImpact?.blastRadius).toBeLessThan(1); // Mostly changed alone in silo commits
  });

  it("should identify abandoned code (rot)", () => {
    const rot = analyzeRot(mockCommits);
    expect(rot.length).toBeGreaterThan(0);
  });
});
















