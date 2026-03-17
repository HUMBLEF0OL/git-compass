import { describe, it, expect, vi } from "vitest";
import { Command } from "commander";
import { configCommand } from "../commands/config.js";
import { analyzeCommand } from "../commands/analyze.js";
import { watchCommand } from "../commands/watch.js";

describe("Command Registration", () => {
  it("should have correct names and descriptions", () => {
    expect(configCommand.name()).toBe("config");
    expect(analyzeCommand.name()).toBe("analyze");
    expect(watchCommand.name()).toBe("watch");
    
    expect(configCommand.description()).toContain("Manage");
    expect(analyzeCommand.description()).toContain("Analyze");
  });

  it("should have expected subcommands for config", () => {
    const subcommands = configCommand.commands.map(cmd => cmd.name());
    expect(subcommands).toContain("set");
    expect(subcommands).toContain("get");
    expect(subcommands).toContain("list");
  });

  it("should have expected options for analyze", () => {
    const optionFlags = analyzeCommand.options.map(opt => opt.flags);
    expect(optionFlags.some(f => f.includes("--path"))).toBe(true);
    expect(optionFlags.some(f => f.includes("--branch"))).toBe(true);
    expect(optionFlags.some(f => f.includes("--output"))).toBe(true);
  });
});



