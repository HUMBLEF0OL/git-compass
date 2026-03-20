"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Flame, 
  BarChart3, 
  Users, 
  Settings, 
  Compass,
  Github
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Hotspots", href: "/hotspots", icon: Flame },
  { name: "Churn", href: "/churn", icon: BarChart3 },
  { name: "Contributors", href: "/contributors", icon: Users },
  { name: "Onboarding", href: "/compass", icon: Compass },
];

import { useSettings } from "@/context/SettingsContext";
import { GitBranch, Folder, Clock, Hash, Sparkles } from "lucide-react";

import { SettingsPanel } from "./SettingsPanel";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { 
    repoPath, 
    branch, 
    window, 
    maxCommits, 
    aiEnabled, 
    updateSettings, 
    branches, 
    loadingBranches 
  } = useSettings();

  return (
    <div className="flex h-full w-64 flex-col bg-background p-4 pr-0">
      <div className="flex h-16 items-center px-4 gap-2 mb-4">
        <Card className="h-10 w-10 flex items-center justify-center rounded-lg shadow-neumo-convex border-0">
            <Github className="h-6 w-6 text-primary" />
        </Card>
        <span className="text-lg font-bold tracking-tight text-foreground/90">Git Compass</span>
      </div>

      <div className="px-4 mb-8 space-y-4">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <GitBranch className="h-4 w-4" />
          </div>
          <select
            value={branch}
            onChange={(e) => updateSettings({ branch: e.target.value })}
            disabled={loadingBranches}
            className="w-full pl-9 pr-4 py-2.5 text-xs font-black bg-card rounded-lg shadow-neumo-flat focus:shadow-neumo-pressed outline-none appearance-none cursor-pointer transition-all border-0 disabled:opacity-50"
          >
            {loadingBranches ? (
              <option>Loading...</option>
            ) : (
              branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-card text-primary shadow-neumo-pressed" 
                  : "text-muted-foreground hover:text-foreground hover:shadow-neumo-convex"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto pt-4 pr-4">
        <Card className="p-4 mb-4 rounded-xl shadow-neumo-flat border-0 bg-background/50">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Active Scope</p>
            <p className="text-xs font-bold truncate text-primary/80">{repoPath}</p>
            <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary">{window}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground">{maxCommits} commits</span>
            </div>
        </Card>
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-neumo-convex transition-all duration-200"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
