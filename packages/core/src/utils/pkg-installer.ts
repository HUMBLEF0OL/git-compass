import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type PackageManager = "npm" | "pnpm" | "yarn";

/**
 * Detects the package manager used in the project.
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  
  // Check parent directories as well (monorepo support)
  const parent = join(cwd, "..");
  if (parent !== cwd && existsSync(parent)) {
    return detectPackageManager(parent);
  }

  return "npm";
}

/**
 * Checks if a package is installed and can be imported.
 */
export function isPackageInstalled(name: string): boolean {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs a package using the detected package manager.
 */
export async function installPackage(name: string, options: { dev?: boolean; cwd?: string } = {}): Promise<void> {
  const pm = detectPackageManager(options.cwd);
  const flag = pm === "yarn" ? (options.dev ? "--dev" : "") : (options.dev ? "-D" : "");
  const cmd = pm === "npm" ? `npm install ${flag} ${name}` : 
              pm === "pnpm" ? `pnpm add ${flag} ${name}` : 
              `yarn add ${flag} ${name}`;

  console.log(`Installing ${name} via ${pm}...`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: options.cwd });
  } catch (error) {
    throw new Error(`Failed to install ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ensures a package is installed, prompting or throwing if not.
 */
export async function ensurePackage(name: string, options: { dev?: boolean; cwd?: string } = {}): Promise<void> {
  if (isPackageInstalled(name)) return;

  // In a CLI, we should ideally ask the user, but for now we'll just install it
  // or throw an error with instructions.
  // Since we the user asked "How can we install the package on the go", 
  // we will proceed with installation.
  
  console.log(`Package ${name} is required but not found.`);
  await installPackage(name, options);
}
