"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { GitBranch, Activity, AlertTriangle, Users, AlertCircle, ShieldCheck, Flame } from "lucide-react";
import dynamic from "next/dynamic";
import { AISummaryCard } from "@/components/AISummaryCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NLQueryBox } from "@/components/NLQueryBox";

const HealthRadar = dynamic(() => import("@/components/charts/HealthRadar").then(mod => mod.HealthRadar), { ssr: false });
const ChurnChart = dynamic(() => import("@/components/charts/ChurnChart").then(mod => mod.ChurnChart), { ssr: false });
const HotspotHeatmap = dynamic(() => import("@/components/charts/HotspotHeatmap").then(mod => mod.HotspotHeatmap), { ssr: false });

import { useSettings } from "@/context/SettingsContext";
import { Loading } from "@/components/ui/Loading";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; message: string }>({ stage: "idle", message: "" });
  const { repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey } = useSettings();

  useEffect(() => {
    let isMounted = true;
    const fetchData = () => {
        setLoading(true);
        setError(null);
        setProgress({ stage: "starting", message: "Connecting to server..." });

        const params = new URLSearchParams({
            repoPath: repoPath || "",
            branch,
            window,
            maxCommits: maxCommits.toString(),
            ai: aiEnabled.toString(),
            aiProvider,
            aiApiKey
        });

        const eventSource = new EventSource(`/api/analyze/stream?${params.toString()}`);

        eventSource.onmessage = (event) => {
            if (!isMounted) return;
            const payload = JSON.parse(event.data);

            if (payload.error) {
                setError(payload.error);
                setLoading(false);
                eventSource.close();
            } else if (payload.stage === "complete") {
                setData(payload.data);
                setLoading(false);
                eventSource.close();
            } else {
                setProgress({ stage: payload.stage, message: payload.message });
            }
        };

        eventSource.onerror = (err) => {
            if (!isMounted) return;
            console.error("EventSource failed:", err);
            setError("Connection lost. Analysis interrupted.");
            setLoading(false);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    };

    const cleanup = fetchData();
    return () => {
        isMounted = false;
        if (cleanup) cleanup();
    };
  }, [repoPath, branch, window, maxCommits, aiEnabled, aiProvider, aiApiKey]);

  if (loading) return <Loading message={progress.message} stage={progress.stage} />;

  if (error) return (
    <div className="max-w-6xl mx-auto p-12 text-center bg-card rounded-xl shadow-neumo-convex">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-black">Analysis Failed</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
    </div>
  );

  if (!data) return null;

  const { hotspots, riskScores, churn, contributors, aiSummary, health, meta } = data;
  const highRiskCount = riskScores.filter((r: any) => r.level === 'critical' || r.level === 'high').length;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-xl bg-card shadow-neumo-convex border-0 lg:sticky lg:top-0 lg:z-10 backdrop-blur-md bg-card/90">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Active Repository
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{meta.repoPath.split(/[\\/]/).pop()}</h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Analyzed {meta.commitCount} commits on <span className="text-primary font-bold">{meta.branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Global Health Score</span>
                <span className="text-2xl font-black text-primary">
                    {Math.round((health.stability + health.velocity + health.simplicity + health.coverage + health.decoupling) / 5)}%
                </span>
            </div>
            <div className="h-12 w-[1px] bg-border mx-2" />
            <div className={`px-4 py-2 rounded-md shadow-neumo-pressed flex items-center gap-2 text-xs font-black ${
                highRiskCount === 0 ? "text-green-500" : "text-destructive"
            }`}>
              {highRiskCount === 0 ? <ShieldCheck className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
              {highRiskCount === 0 ? "STABLE" : `${highRiskCount} CRITICAL RISKS`}
            </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        <MetricCard title="Files Changed" value={hotspots.length} subtitle="In last window" />
        <MetricCard title="Active Authors" value={contributors.length} subtitle={`${meta.window} active`} />
        <MetricCard 
            title="Churn Index" 
            value={(() => {
                const totalLines = churn.reduce((acc: number, curr: any) => acc + curr.linesAdded, 0);
                if (totalLines >= 1000000) return `${(totalLines / 1000000).toFixed(1)}M`;
                if (totalLines >= 1000) return `${Math.round(totalLines / 1000)}k`;
                return totalLines;
            })()} 
            subtitle="Net Lines Impacted" 
        />
        <MetricCard 
            title="Avg Risk" 
            value={Math.round(riskScores.reduce((acc: number, curr: any) => acc + curr.score, 0) / (riskScores.length || 1))} 
            subtitle="Score out of 100" 
        />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
            <AISummaryCard summary={aiSummary || "Run analysis with AI enabled to see deep insights."} />
            
            <Card className="neumo-flat overflow-hidden border-0">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-black flex items-center justify-between">
                        Temporal Stability
                        <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-background/50 rounded-md shadow-neumo-pressed">Lines added/removed</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="bg-background/20 m-6 rounded-lg shadow-neumo-pressed p-6">
                    <ErrorBoundary name="ChurnChart">
                        <ChurnChart data={churn} />
                    </ErrorBoundary>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card className="neumo-convex border-0 bg-gradient-to-br from-card to-background">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Repository Health Radar</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <ErrorBoundary name="HealthRadar">
                        <HealthRadar data={health} />
                    </ErrorBoundary>
                    <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        {Object.entries(health).map(([key, val]: any) => (
                            <div key={key} className="p-3 rounded-lg bg-background/30 shadow-neumo-pressed">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{key}</p>
                                <p className="text-sm font-black">{val}%</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Critical Areas</h3>
                <div className="space-y-4">
                    {riskScores.slice(0, 5).map((risk: any) => (
                        <div key={risk.path} className="flex items-center justify-between p-4 rounded-lg bg-card shadow-neumo-flat border-0 group hover:shadow-neumo-convex transition-all cursor-pointer">
                            <div className="overflow-hidden mr-4">
                                <p className="text-xs font-bold truncate text-foreground/80 group-hover:text-primary transition-colors">{risk.path.split(/[\\/]/).pop()}</p>
                                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Impact Score: {risk.score}</p>
                            </div>
                            <div className={`h-2 w-2 rounded-full shadow-sm ${
                                risk.score > 70 ? 'bg-destructive animate-pulse' : 
                                risk.score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
      </div>
      
      <section className="pt-8">
          <NLQueryBox analysisData={data} />
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string, value: string | number, subtitle: string }) {
    return (
        <Card className="neumo-flat group">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black">{value}</div>
                <div className="mt-2 text-[9px] font-bold text-muted-foreground bg-background/50 px-2 py-1 rounded shadow-neumo-pressed w-fit">{subtitle}</div>
            </CardContent>
        </Card>
    );
}
