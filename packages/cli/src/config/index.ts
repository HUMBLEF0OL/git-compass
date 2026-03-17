import Conf from "conf";
import { PROJECT_NAME } from "../constants/index.js";

const schema = {
  ai: {
    type: "object",
    properties: {
      key: { type: "string" }
    }
  }
} as const;

export const config = new Conf({ 
  projectName: PROJECT_NAME,
  schema 
});
