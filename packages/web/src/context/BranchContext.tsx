"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface BranchContextType {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  branches: string[];
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const initialBranch = searchParams.get("branch") || "HEAD";
  const [selectedBranch, setSelectedBranchState] = useState(initialBranch);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch("/api/branches");
        const data = await res.json();
        if (data.branches) {
          setBranches(data.branches);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  const setSelectedBranch = (branch: string) => {
    setSelectedBranchState(branch);
    const params = new URLSearchParams(searchParams);
    params.set("branch", branch);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches, loading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
