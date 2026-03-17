import Conf from "conf";
import { PROJECT_NAME } from "../constants/index.js";

const schema = {
  ai: {
    type: "object",
    properties: {
      key: { type: "string" },
      provider: { type: "string", enum: ["anthropic", "openai", "gemini"] },
      anthropicKey: { type: "string" },
      openaiKey: { type: "string" },
      geminiKey: { type: "string" }
    }
  }
} as const;

export const config = new Conf({ 
  projectName: PROJECT_NAME,
  schema 
});
