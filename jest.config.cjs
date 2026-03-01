const { createDefaultPreset } = require("ts-jest");

const tsJest = createDefaultPreset({
  tsconfig: "tsconfig.json",
  useESM: true,
});

module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    ...tsJest.transform,
  },
};