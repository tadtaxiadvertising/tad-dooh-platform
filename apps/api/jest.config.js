/** Jest configuration for TAD API */
const config = {
  rootDir: ".",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/packages/impact-calculator/dist/",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    // rootDir es apps/api/, packages/ está en el proyecto raíz (2 niveles arriba).
    "^@tad/(.*)$": "<rootDir>/../../packages/$1",
  },
  reporters: ["default"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  modulePaths: ["<rootDir>/apps/api/src"],

  // Personal harness (sin jest.test/describe) que no puede ejecutarse dentro
  // del worker de Jest sin crashar en process.exit.
  testPathIgnorePatterns: [
    "<rootDir>/src/libs/impact-calculator/__tests__/",
  ],
};

module.exports = config;
