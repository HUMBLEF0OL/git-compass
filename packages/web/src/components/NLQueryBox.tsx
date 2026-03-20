"use client";

import { useState } from "react";
import { Search, Loader2, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useSettings } from "@/context/SettingsContext";

interface NLQueryBoxProps {
  analysisData?: any;
}

export function NLQueryBox({ analysisData }: NLQueryBoxProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { aiProvider, aiApiKey, aiEnabled } = useSettings();

  const isAiSetup = aiEnabled && aiApiKey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || !isAiSetup) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          analysisContext: analysisData,
          aiProvider,
          aiApiKey
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Query failed");

      setAnswer(data.answer);
    } catch (err: any) {
      console.error("Query error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`border-primary/20 bg-muted/30 overflow-hidden relative ${!isAiSetup ? 'opacity-80' : ''}`}>
        {!isAiSetup && (
          <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-background/40 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="flex flex-col items-center text-center gap-3 px-8 max-w-[90%] mx-auto">
              <div>
                <h4 className="text-[10px] font-black tracking-[0.2em] text-foreground/80 mb-1">AI SEARCH LOCKED</h4>
                <p className="text-[9px] font-semibold text-muted-foreground leading-tight text-balance">
                  Enable AI and provide an API key in settings to unlock natural language queries.
                </p>
              </div>
            </div>
          </div>
        )}

        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="space-y-4 w-full">
              <div className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={!isAiSetup}
                  placeholder={isAiSetup ? "Ask a question about your code..." : "AI Search is disabled"}
                  className="w-full bg-background rounded-lg px-6 py-4 pr-12 text-sm shadow-neumo-pressed border-0 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading || !isAiSetup}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md bg-card shadow-neumo-flat text-primary hover:shadow-neumo-convex active:shadow-neumo-pressed transition-all disabled:opacity-50 disabled:shadow-neumo-flat disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {answer && (
        <Card className="bg-card shadow-neumo-convex animate-in fade-in zoom-in-95 duration-300">
          <CardContent className="p-6 relative">
            <button
              onClick={() => setAnswer(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary shadow-neumo-flat">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {answer}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
