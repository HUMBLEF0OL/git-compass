"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Sparkles, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  summary?: string | null;
  generatedAt?: Date;
}

export function AISummaryCard({ summary, generatedAt }: Props) {
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-2" />;

      // Header detection (ALL CAPS or starts with #)
      const isHeader = (trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3 && !trimmedLine.startsWith('-')) || trimmedLine.startsWith('#');
      if (isHeader) {
        return (
          <h3 key={i} className="text-sm font-black tracking-widest text-primary mt-6 mb-2 uppercase flex items-center gap-2">
            <div className="h-1 w-4 bg-primary rounded-full shadow-neumo-flat" />
            {trimmedLine.replace(/^#+\s*/, '')}
          </h3>
        );
      }

      // Bullet point detection
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('•')) {
        return (
          <div key={i} className="flex gap-3 mb-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group">
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shadow-neumo-flat shrink-0" />
            <span className="text-sm text-foreground/80 leading-relaxed">
              {trimmedLine.replace(/^[-*•]\s*/, '')}
            </span>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={i} className="text-sm text-foreground/70 leading-relaxed mb-3 px-2">
          {trimmedLine}
        </p>
      );
    });
  };

  return (
    <Card className="border-0 shadow-neumo-convex bg-gradient-to-br from-card to-background overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-primary/5 bg-background/20">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
          AI Summary
        </CardTitle>
        {generatedAt && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground px-3 py-1.5 rounded-full shadow-neumo-pressed bg-background/30 uppercase tracking-tighter">
            <Clock className="h-3 w-3" />
            SYNCHRONIZED: {new Date(generatedAt).toLocaleDateString()}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {summary ? (
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            {renderContent(summary)}
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground italic text-sm gap-4 transition-all animate-in fade-in zoom-in-95 duration-700">
            <div className="p-4 rounded-full bg-background shadow-neumo-pressed opacity-40">
              <Sparkles className="h-8 w-8 stroke-1" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-foreground/60 uppercase tracking-tighter">AI INSIGHTS SILENCED</p>
              <p className="not-italic text-[10px] font-medium opacity-70 max-w-[200px] leading-tight">
                Enable AI and provide your API key in settings to activate the architectural pulse.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
