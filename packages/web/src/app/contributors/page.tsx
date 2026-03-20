"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, ShieldCheck, Flame, AlertCircle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import dynamic from "next/dynamic";
const ContributorImpactChart = dynamic(() => import("@/components/charts/ContributorImpactChart").then(mod => mod.ContributorImpactChart), { ssr: false });

export default function ContributorsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey } = useSettings();

  useEffect(() => {
    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  repoPath,
                  branch,
                  window,
                  maxCommits,
                  ai: aiEnabled,
                  aiProvider,
                  aiApiKey
                }),
            });
            if (!response.ok) throw new Error("Failed to fetch analysis data");
            const result = await response.json();
            setData(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey]);

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-10 animate-pulse">
        <div className="h-40 bg-card/50 rounded-xl" />
        <div className="h-96 bg-card/50 rounded-xl" />
        <div className="grid gap-8 md:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-card/50 rounded-xl" />)}
        </div>
    </div>
  );

  if (error) return (
    <div className="max-w-6xl mx-auto p-12 text-center bg-card rounded-xl shadow-neumo-convex">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-black">Analysis Failed</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
    </div>
  );

  if (!data) return null;

  const { contributors, contributorTimeline, burnout, knowledge } = data;

  // Get all unique authors from the entire dataset
  const allAuthors = Array.from(
    new Set(
      contributorTimeline.flatMap((p: any) => Object.keys(p.impacts))
    )
  ) as string[];

  // Transform timeline for Recharts and fill in gaps
  const chartData = contributorTimeline.map((p: any) => {
    const point: any = {
      dateStr: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
    allAuthors.forEach(author => {
      point[author] = p.impacts[author] || 0;
    });
    return point;
  });

  const highRiskBurnout = burnout.contributors.filter((b: any) => b.riskLevel === 'high').length;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-xl bg-card shadow-neumo-convex border-0 lg:sticky lg:top-0 lg:z-10 backdrop-blur-md bg-card/90">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Team Dynamics
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Contributors</h1>
          <p className="text-muted-foreground mt-2 font-medium">Activity and impact analysis per team member</p>
        </div>
        <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-md shadow-neumo-pressed flex items-center gap-2 text-xs font-black ${
                highRiskBurnout > 0 ? "text-destructive" : "text-green-500"
            }`}>
              {highRiskBurnout > 0 ? <Flame className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {highRiskBurnout > 0 ? `${highRiskBurnout} BURNOUT RISKS` : "TEAM STABLE"}
            </div>
            <div className="px-4 py-2 rounded-md shadow-neumo-pressed flex items-center gap-2 text-xs font-black text-primary uppercase">
                <Users className="h-4 w-4" />
                {contributors.length} ACTIVE
            </div>
        </div>
      </div>

      <section className="grid gap-8">
        <Card className="neumo-flat border-0 overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="text-xl font-black flex items-center justify-between">
                    Contribution Velocity
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-3 py-1 bg-background/50 rounded-md shadow-neumo-pressed">Lines added per day per author</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="bg-background/20 m-6 rounded-lg shadow-neumo-pressed p-6">
                <ContributorImpactChart data={chartData} />
            </CardContent>
        </Card>

        <div className="grid gap-8 md:grid-cols-2">
            <Card className="neumo-convex border-0 bg-gradient-to-br from-card to-background">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Knowledge Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {knowledge.slice(0, 6).map((item: any) => (
                            <div key={item.path} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold truncate max-w-[200px] text-foreground/80">{item.path.split(/[\\/]/).pop()}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">{item.mainContributor}</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-neumo-pressed ${
                                            item.riskLevel === 'high' ? 'text-destructive' : 'text-primary'
                                        }`}>{item.authorshipPercent}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-background/50 rounded-full shadow-neumo-pressed overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${item.riskLevel === 'high' ? 'bg-destructive' : 'bg-primary'}`} 
                                        style={{ width: `${item.authorshipPercent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="neumo-flat border-0">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {contributors.sort((a: any, b: any) => b.commitCount - a.commitCount).slice(0, 5).map((c: any) => {
                            const burnoutRisk = burnout.contributors.find((b: any) => b.author === c.author);
                            return (
                                <div key={c.author} className="flex items-center justify-between p-4 rounded-xl bg-card shadow-neumo-flat group hover:shadow-neumo-convex transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-background shadow-neumo-pressed flex items-center justify-center text-xs font-black text-primary uppercase">
                                            {c.author.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black group-hover:text-primary transition-colors">{c.author}</p>
                                            <p className="text-[10px] text-muted-foreground">{c.commitCount} commits</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded shadow-neumo-pressed text-[9px] font-black uppercase tracking-tighter ${
                                        burnoutRisk?.riskLevel === 'high' ? 'text-destructive animate-pulse' :
                                        burnoutRisk?.riskLevel === 'medium' ? 'text-orange-500' : 'text-green-500'
                                    }`}>
                                        {burnoutRisk?.riskLevel || 'LOW'} RISK
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {contributors.map((c: any) => (
                <Card key={c.author} className="neumo-flat border-0 group hover:shadow-neumo-convex transition-all">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-black group-hover:text-primary transition-colors">{c.author}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{c.email}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-background shadow-neumo-pressed flex items-center justify-center text-[10px] font-black text-primary uppercase">
                                {c.author.substring(0, 2)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 border-t border-border/10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Files Changed</p>
                                <p className="text-lg font-black">{c.filesChanged}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Active Days</p>
                                <p className="text-lg font-black">{c.activeDays}</p>
                            </div>
                            <div className="col-span-2 pt-2">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Impact Score</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-background shadow-neumo-pressed rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary rounded-full" 
                                            style={{ width: `${Math.min(100, (c.linesAdded / 1000) * 100)}%` }} 
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-primary">+{c.linesAdded}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
