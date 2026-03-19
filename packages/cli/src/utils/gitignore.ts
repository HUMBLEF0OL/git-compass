import fs from "fs/promises";
import path from "path";

/**
 * Ensures that specific entries are present in the .gitignore file at the repo root.
 */
export async function ensureGitIgnore(repoRoot: string, entries: string[]): Promise<void> {
  const gitIgnorePath = path.join(repoRoot, ".gitignore");
  
  try {
    let content = "";
    try {
      content = await fs.readFile(gitIgnorePath, "utf-8");
    } catch (err) {
      // If .gitignore doesn't exist, we'll create it
    }

    const lines = content.split(/\r?\n/);
    let modified = false;

    for (const entry of entries) {
      if (!lines.some(line => line.trim() === entry)) {
        lines.push(entry);
        modified = true;
      }
    }

    if (modified) {
      // Ensure there's a newline at the end if we added something
      if (lines[lines.length - 1] !== "") {
        lines.push("");
      }
      await fs.writeFile(gitIgnorePath, lines.join("\n"), "utf-8");
    }
  } catch (err) {
    console.warn(`Could not update .gitignore: ${(err as Error).message}`);
  }
}
