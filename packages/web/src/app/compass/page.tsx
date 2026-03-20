"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Compass, Map, Flag, Zap, BookOpen, Layers, AlertCircle } from "lucide-react";

import { useSettings } from "@/context/SettingsContext";

export default function CompassPage() {
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

  if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Building priority map...</div>;
  if (!data) return null;

  const { compass, hotspots, riskScores } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-xl bg-card shadow-neumo-convex border-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Onboarding Compass</h1>
          <p className="text-muted-foreground mt-2">
            A priority map for new developers to understand where to start and what to avoid.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground bg-background/50 px-4 py-2 rounded-full shadow-neumo-pressed">
          <Map className="h-4 w-4 text-primary" />
          Architecture Guide
        </div>
      </div>
 
      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-6">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Essential Files
            </h2>
            <div className="grid gap-4">
                {((compass?.essentials && compass.essentials.length > 0) ? compass.essentials : hotspots.slice(0, 3)).map((file: any) => (
                    <Card key={file.path} className="neumo-convex border-0">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold truncate">{file.path.split(/[\\/]/).pop()}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[10px] text-muted-foreground mb-3">{file.reason || "Foundational component with consistent history."}</p>
                            <div className="flex gap-2">
                                {(file.tags || [file.type || "core", "High Impact"]).map((tag: string) => (
                                    <span key={tag} className="text-[9px] font-black px-2 py-0.5 rounded-md bg-background/50 shadow-neumo-pressed text-primary uppercase">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        <section className="space-y-6">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Component Maturity
            </h2>
            <Card className="neumo-flat border-0 h-[calc(100%-3rem)]">
                <CardContent className="pt-6">
                    <div className="space-y-4 bg-background/20 p-6 rounded-lg shadow-neumo-pressed h-full">
                        {(compass?.components || []).map((comp: any) => (
                            <div key={comp.name} className="flex items-center justify-between p-3 rounded-lg bg-card shadow-neumo-flat group hover:shadow-neumo-convex transition-all">
                                <span className="text-sm font-bold">{comp.name}</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md shadow-neumo-pressed ${
                                    comp.maturity === 'Stable' ? 'text-green-500' :
                                    comp.maturity === 'Evolving' ? 'text-blue-500' :
                                    'text-orange-500'
                                }`}>
                                    {comp.maturity.toUpperCase()}
                                </span>
                            </div>
                        ))}
                        {(!compass?.components || compass.components.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground text-sm italic">Component maturity mapping available in full analysis.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tight text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Danger Zone: High Complexity
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
            {riskScores.slice(0, 3).map((risk: any) => (
                <Card key={risk.path} className="neumo-flat border-l-4 border-l-destructive/50">
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-bold truncate font-mono">{risk.path.split(/[\\/]/).pop()}</CardTitle>
                        <p className="text-[10px] text-muted-foreground mt-1">Blast radius index: {risk.score}/100</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="w-full bg-background/50 h-1 rounded-md shadow-neumo-pressed overflow-hidden">
                            <div className="bg-destructive h-full" style={{ width: `${risk.score}%` }} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>

      <Card className="neumo-flat border-0 bg-background/10">
        <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                Contributor Documentation
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="p-6 rounded-lg bg-background/30 shadow-neumo-pressed italic text-sm text-foreground/70 leading-relaxed border-0">
                {compass?.documentation || "No specific contributor documentation available for this repository yet. Analysis based on commit patterns and architectural hotspots."}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

