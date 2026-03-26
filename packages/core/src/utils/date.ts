import type { WindowDays } from "../types/analytics.js";

/**
 * Calculates the cutoff date for a given analysis window in days.
 */
export function getWindowCutoff(windowDays: WindowDays): Date {
  const now = new Date();
  now.setDate(now.getDate() - windowDays);
  return now;
}

/**
 * Calculates the difference in days between two dates.
 */
export function getDiffDays(d1: Date, d2: Date): number {
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
}

