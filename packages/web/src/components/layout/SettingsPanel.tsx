"use client";

import { useSettings, AnalysisWindow } from "@/context/SettingsContext";
import { Folder, Clock, Hash, Sparkles, X } from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { 
    repoPath, 
    window, 
    maxCommits, 
    aiEnabled, 
    aiProvider,
    aiApiKey,
    updateSettings 
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-neumo-convex border-0 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border/10">
          <h2 className="text-xl font-black text-foreground">Analysis Settings</h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg shadow-neumo-flat hover:shadow-neumo-pressed transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Repo Path */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Folder className="h-3 w-3" />
              Repository Path
            </label>
            <div className="relative group">
              <input 
                type="text"
                value={repoPath}
                onChange={(e) => updateSettings({ repoPath: e.target.value })}
                className="w-full px-4 py-3 bg-background shadow-neumo-pressed rounded-xl border-0 text-sm font-bold focus:shadow-neumo-flat transition-all outline-none"
                placeholder="e.g. ../../"
              />
            </div>
          </div>

          {/* Time Window */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Clock className="h-3 w-3" />
              Time Window
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(["7d", "30d", "90d", "1y", "all"] as AnalysisWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => updateSettings({ window: w })}
                  className={`py-2 text-[10px] font-black rounded-lg transition-all ${
                    window === w 
                      ? "bg-card text-primary shadow-neumo-pressed" 
                      : "bg-background text-muted-foreground shadow-neumo-flat hover:shadow-neumo-convex"
                  }`}
                >
                  {w.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
             {/* Max Commits */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Max Commits
                </label>
                <input 
                    type="number"
                    value={maxCommits}
                    onChange={(e) => updateSettings({ maxCommits: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-background shadow-neumo-pressed rounded-xl border-0 text-sm font-bold focus:shadow-neumo-flat transition-all outline-none"
                />
            </div>

            {/* AI Toggle */}
            <div className="space-y-3 text-right">
                <label className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    AI Insights
                </label>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => updateSettings({ aiEnabled: !aiEnabled })}
                        className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${
                            aiEnabled ? "bg-primary shadow-neumo-pressed" : "bg-card shadow-neumo-flat"
                        }`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                            aiEnabled ? "translate-x-7" : "translate-x-0"
                        }`} />
                    </button>
                </div>
            </div>
          </div>

          {/* AI Configuration (Provider & Key) */}
          {aiEnabled && (
            <div className="space-y-6 pt-4 border-t border-border/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Provider
                  </label>
                  <select
                    value={aiProvider}
                    onChange={(e) => updateSettings({ aiProvider: e.target.value as any })}
                    className="w-full px-4 py-3 bg-background shadow-neumo-pressed rounded-xl border-0 text-sm font-bold focus:shadow-neumo-flat transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Gemini (Google)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-background shadow-neumo-pressed rounded-xl border-0 text-sm font-bold focus:shadow-neumo-flat transition-all outline-none"
                  />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground italic text-center">
                Your API key is stored locally in your browser and never leaves this session except to call the AI provider.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-background/50 border-t border-border/10">
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-sm font-black shadow-neumo-convex hover:shadow-neumo-flat active:shadow-neumo-pressed transition-all uppercase tracking-widest"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
