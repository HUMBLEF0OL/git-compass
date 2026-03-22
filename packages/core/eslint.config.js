import sharedConfig from "@git-compass/eslint-config";

export default [
  ...sharedConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
