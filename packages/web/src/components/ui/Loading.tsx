import React from "react";
import { Activity } from "lucide-react";

interface LoadingProps {
  message?: string;
  stage?: string;
}

const STAGES = ["starting", "commits", "hotspots", "churn", "advanced", "ai"];

export function Loading({ message = "Analyzing Repository...", stage = "starting" }: LoadingProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col items-center justify-center p-20 rounded-xl bg-card/30 border border-primary/10 shadow-neumo-pressed animate-pulse">
        <Activity className="h-12 w-12 text-primary mb-6 animate-spin-slow" />
        <h2 className="text-2xl font-black tracking-tighter uppercase">
          {message}
        </h2>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                stage === s
                  ? "bg-primary animate-pulse"
                  : STAGES.indexOf(stage) > STAGES.indexOf(s)
                  ? "bg-primary/40"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card/50 rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-card/50 rounded-xl animate-pulse" />
    </div>
  );
}
