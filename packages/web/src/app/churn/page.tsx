"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import dynamic from "next/dynamic";
const ChurnChart = dynamic(() => import("@/components/charts/ChurnChart").then(mod => mod.ChurnChart), { ssr: false });
import { BarChart3, TrendingUp, TrendingDown, Info } from "lucide-react";

import { useSettings } from "@/context/SettingsContext";
import { Loading } from "@/components/ui/Loading";

export default function ChurnPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey } = useSettings();

  useEffect(() => {
    async function fetchData() {
        setLoading(true);
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey]);

  if (loading) return <Loading message="Analyzing Churn..." stage="churn" />;
  if (!data) return null;

  const { churn } = data;
  const totalAdded = churn.reduce((acc: number, d: any) => acc + d.linesAdded, 0);
  const totalRemoved = churn.reduce((acc: number, d: any) => acc + d.linesRemoved, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-xl bg-card shadow-neumo-convex border-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Code Churn</h1>
          <p className="text-muted-foreground mt-2">
            Track additions and deletions over time to identify stability trends.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground bg-background/50 px-4 py-2 rounded-full shadow-neumo-pressed">
          <BarChart3 className="h-4 w-4 text-primary" />
          Stability Analysis
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="neumo-flat">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Total Additions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-foreground">+{totalAdded.toLocaleString()}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 px-3 py-1 bg-background/30 rounded-md shadow-neumo-pressed w-fit">Lines across all commits</p>
            </CardContent>
        </Card>
        <Card className="neumo-flat">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Total Deletions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-foreground">-{totalRemoved.toLocaleString()}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 px-3 py-1 bg-background/30 rounded-md shadow-neumo-pressed w-fit">Code removed or refactored</p>
            </CardContent>
        </Card>
        <Card className="neumo-convex bg-gradient-to-br from-card to-background border-0">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3">
                    <Info className="h-4 w-4" />
                    Net Growth
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-primary">{(totalAdded - totalRemoved).toLocaleString()}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 italic px-3 py-1 bg-background/30 rounded-md shadow-neumo-pressed w-fit">Delta change in codebase size</p>
            </CardContent>
        </Card>
      </div>

      <Card className="neumo-flat overflow-hidden">
        <CardHeader>
            <CardTitle className="text-xl font-black tracking-tight">Temporal Trends</CardTitle>
        </CardHeader>
        <CardContent className="bg-background/20 m-6 rounded-lg shadow-neumo-pressed p-8 relative overflow-hidden">
            <div className="relative z-10">
                <ChurnChart data={churn} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
