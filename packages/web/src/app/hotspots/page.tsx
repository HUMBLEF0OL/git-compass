"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertCircle, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import dynamic from "next/dynamic";
const ImpactScatter = dynamic(() => import("@/components/charts/ImpactScatter").then(mod => mod.ImpactScatter), { ssr: false });

export default function HotspotsPage() {
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
        <div className="h-60 bg-card/50 rounded-xl" />
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

  const { hotspots, riskScores } = data;

  // Map to Scatter format
  const scatterData = hotspots.map((h: any) => ({
    path: h.path,
    changeCount: h.changeCount,
    riskScore: h.riskScore,
    authors: h.uniqueAuthors
  }));

  const criticalHotspots = hotspots.filter((h: any) => h.riskScore > 70);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-xl bg-card shadow-neumo-convex border-0 lg:sticky lg:top-0 lg:z-10 backdrop-blur-md bg-card/90">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Analysis Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Code Hotspots</h1>
          <p className="text-muted-foreground mt-2 font-medium">Identify files with high churn and high architectural risk</p>
        </div>
        <div className={`px-4 py-2 rounded-md shadow-neumo-pressed flex items-center gap-2 text-xs font-black ${
            criticalHotspots.length > 0 ? "text-destructive" : "text-green-500"
        }`}>
            <AlertTriangle className="h-4 w-4" />
            {criticalHotspots.length} CRITICAL FILES
        </div>
      </div>

      <section className="grid gap-8">
        <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2 neumo-flat border-0 overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-black flex items-center justify-between">
                        Hotspot Risk Analysis
                        <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-background/50 rounded-md shadow-neumo-pressed uppercase">Churn vs Complexity</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="bg-background/20 m-6 rounded-lg shadow-neumo-pressed p-6">
                    <ImpactScatter data={scatterData} />
                </CardContent>
            </Card>

            <Card className="neumo-convex border-0 bg-gradient-to-br from-card to-background">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Top Risk Files</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {riskScores.slice(0, 5).map((risk: any) => (
                            <div key={risk.path} className="space-y-2 group">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black truncate max-w-[150px] text-foreground/80 group-hover:text-primary transition-colors">{risk.path.split(/[\\/]/).pop()}</span>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md shadow-neumo-pressed ${
                                        risk.score > 70 ? "text-destructive" : "text-orange-500"
                                    }`}>
                                        {risk.level?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-background/50 rounded-full shadow-neumo-pressed overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${risk.score > 70 ? 'bg-destructive' : 'bg-orange-500'}`} 
                                        style={{ width: `${risk.score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className="neumo-flat border-0 overflow-hidden">
          <CardHeader className="pb-0 pt-8 px-8">
            <CardTitle className="text-xl font-black">Refined Hotspots Table</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="overflow-x-auto bg-background/20 rounded-xl shadow-neumo-pressed p-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/10 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    <th className="px-4 pb-4 pt-2">File</th>
                    <th className="px-4 pb-4 pt-2">Changes</th>
                    <th className="px-4 pb-4 pt-2">Authors</th>
                    <th className="px-4 pb-4 pt-2">Lines Impacted</th>
                    <th className="px-4 pb-4 pt-2 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium">
                  {hotspots.slice(0, 20).map((file: any) => (
                    <tr key={file.path} className="group hover:bg-card/50 transition-all border-b border-border/5">
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <p className="text-foreground/90 font-black group-hover:text-primary transition-colors">{file.path.split(/[\\/]/).pop()}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-sm">{file.path}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-black">{file.changeCount}</td>
                      <td className="px-4 py-4 font-black">{file.uniqueAuthors}</td>
                      <td className="px-4 py-4 font-black">{file.linesImpacted}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`px-2 py-1 rounded shadow-neumo-pressed text-[10px] font-black ${
                            file.riskScore > 70 ? 'text-destructive' :
                            file.riskScore > 40 ? 'text-orange-500' :
                            'text-primary'
                        }`}>
                            {file.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
