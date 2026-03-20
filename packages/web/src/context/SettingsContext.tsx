"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { encrypt, decrypt } from "@/utils/crypto";

export type AnalysisWindow = "7d" | "30d" | "90d" | "1y" | "all";
export type AIProvider = "openai" | "anthropic" | "google";

interface Settings {
  repoPath: string;
  branch: string;
  window: AnalysisWindow;
  maxCommits: number;
  aiEnabled: boolean;
  aiProvider: AIProvider;
  aiApiKey: string;
}

const DEFAULT_SETTINGS: Settings = {
  repoPath: "", // Empty so server defaults (GIT_COMPASS_CWD) can take over
  branch: "HEAD",
  window: "30d",
  maxCommits: 500,
  aiEnabled: false,
  aiProvider: "openai",
  aiApiKey: "",
};

interface SettingsContextType extends Settings {
  updateSettings: (updates: Partial<Settings>) => void;
  branches: string[];
  loadingBranches: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function SettingsSync({ setSettings, searchParams }: { 
  setSettings: React.Dispatch<React.SetStateAction<Settings>>,
  searchParams: ReturnType<typeof useSearchParams>
}) {
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    const storedKeyEncrypted = localStorage.getItem("git-compass-ai-key") || "";
    const storedKey = decrypt(storedKeyEncrypted);
    
    setSettings(prev => ({
      ...prev,
      repoPath: params.repoPath || prev.repoPath,
      branch: params.branch || prev.branch,
      window: (params.window as AnalysisWindow) || prev.window,
      maxCommits: params.maxCommits ? parseInt(params.maxCommits) : prev.maxCommits,
      aiEnabled: params.ai === "true",
      aiProvider: (params.aiProvider as AIProvider) || prev.aiProvider,
      aiApiKey: storedKey,
    }));
  }, [searchParams, setSettings]);

  return null;
}

function SettingsContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const fetchBranches = useCallback(async (path: string) => {
    setLoadingBranches(true);
    try {
      const res = await fetch(`/api/branches?repoPath=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      if (data.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
      setBranches(["HEAD"]); // Fallback
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches(settings.repoPath);
  }, [settings.repoPath, fetchBranches]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    // 1. Update State
    setSettings(prev => ({ ...prev, ...updates }));

    // 2. Persist API Key to LocalStorage (Encrypted)
    if (updates.aiApiKey !== undefined) {
      localStorage.setItem("git-compass-ai-key", encrypt(updates.aiApiKey));
    }

    // 3. Sync other settings to URL
    const params = new URLSearchParams(searchParams);
    if (updates.repoPath !== undefined) params.set("repoPath", updates.repoPath);
    if (updates.branch !== undefined) params.set("branch", updates.branch);
    if (updates.window !== undefined) params.set("window", updates.window);
    if (updates.maxCommits !== undefined) params.set("maxCommits", updates.maxCommits.toString());
    if (updates.aiEnabled !== undefined) params.set("ai", updates.aiEnabled.toString());
    if (updates.aiProvider !== undefined) params.set("aiProvider", updates.aiProvider);
    
    // 4. Update Router (Side-effect)
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <SettingsContext.Provider value={{ 
        ...settings,
        updateSettings, 
        branches, 
        loadingBranches 
    }}>
      <Suspense fallback={null}>
        <SettingsSync setSettings={setSettings} searchParams={searchParams} />
      </Suspense>
      {children}
    </SettingsContext.Provider>
  );
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SettingsContent>
        {children}
      </SettingsContent>
    </Suspense>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
