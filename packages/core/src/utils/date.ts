import type { AnalysisWindow } from "../types.js";

/**
 * Calculates the cutoff date for a given analysis window.
 */
export function getWindowCutoff(window: AnalysisWindow): Date {
  if (window === "all") return new Date(0);

  const now = new Date();
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  
  // Type safety for dynamic lookup
  const dayCount = days[window as keyof typeof days] || 30;
  now.setDate(now.getDate() - dayCount);
  return now;
}

/**
 * Calculates the difference in days between two dates.
 */
export function getDiffDays(d1: Date, d2: Date): number {
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
}














