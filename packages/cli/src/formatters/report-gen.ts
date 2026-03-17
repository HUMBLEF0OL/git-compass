import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import type { AnalysisResult } from "@grotto/core";

export async function exportJson(result: AnalysisResult, outputPath: string) {
  const fullPath = path.resolve(outputPath);
  await fs.writeFile(fullPath, JSON.stringify(result, null, 2), "utf-8");
  return fullPath;
}
