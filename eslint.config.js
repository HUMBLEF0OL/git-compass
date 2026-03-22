import sharedConfig from "@git-compass/eslint-config";

export default [
  ...sharedConfig,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/tmp/**", "**/.turbo/**"],
  },
];
