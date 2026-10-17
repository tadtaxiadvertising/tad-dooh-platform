/** Jest configuration for TAD API */
const config = {
  rootDir: ".",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@tad/(.*)$": "<rootDir>/packages/$1",
  },
  reporters: ["default"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  modulePaths: ["<rootDir>/apps/api/src"],
};

module.exports = config;
