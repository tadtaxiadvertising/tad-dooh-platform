const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo packages
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/services'),
  path.resolve(monorepoRoot, 'packages/ui'),
  path.resolve(monorepoRoot, 'packages/store'),
  path.resolve(monorepoRoot, 'packages/logging'),
];

// Resolve monorepo packages from driver-native
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
