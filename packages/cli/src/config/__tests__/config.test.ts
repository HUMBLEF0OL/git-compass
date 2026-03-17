import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { config } from "../index.js";

// Mock fs to avoid writing to actual .env
vi.mock("fs");

describe("EnvConfig", () => {
  const mockEnvPath = path.resolve(process.cwd(), ".env");

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return undefined if key does not exist and .env is missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(config.get("non-existent")).toBeUndefined();
  });

  it("should get value from process.env if .env is missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    process.env.TEST_KEY = "test-value";
    expect(config.get("TEST_KEY")).toBe("test-value");
    delete process.env.TEST_KEY;
  });

  it("should set value in .env file", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("");
    
    config.set("ai.provider", "openai");
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".env"),
      expect.stringContaining("GIT_COMPASS_AI_PROVIDER=openai"),
      "utf-8"
    );
  });

  it("should update existing value in .env file", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("GIT_COMPASS_AI_PROVIDER=anthropic\nOTHER_KEY=val");
    
    config.set("ai.provider", "gemini");
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".env"),
      expect.stringContaining("GIT_COMPASS_AI_PROVIDER=gemini\nOTHER_KEY=val"),
      "utf-8"
    );
  });

  it("should retrieve masked store accurately", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("GIT_COMPASS_AI_PROVIDER=openai\nOPENAI_API_KEY=sk-12345");
    
    const store = config.store;
    expect(store.ai.provider).toBe("openai");
    expect(store.ai.openaiKey).toBe("sk-12345");
  });
});



