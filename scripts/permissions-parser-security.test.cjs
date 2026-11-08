"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root,
  "packages/permissions/package.json"), "utf8"));
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8").replace(/\r\n?/g, "\n");
const eslintConfig = fs.readFileSync(path.join(root,
  "packages/permissions/eslint.config.cjs"), "utf8");

test("the declared scoped parser handles the actual TypeScript lint contract", () => {
  const permissionsRequire = createRequire(path.join(root, "packages/permissions/package.json"));
  const parser = permissionsRequire("@typescript-eslint/parser");
  const ast = parser.parse("const role: string = 'DRIVER';", { sourceType: "module", ecmaVersion: 2022 });
  assert.equal(ast.body[0].type, "VariableDeclaration");
  assert.equal(ast.body[0].declarations[0].id.typeAnnotation.typeAnnotation.type, "TSStringKeyword");
});

test("permissions declares its actually used TypeScript ESLint parser and plugin", () => {
  assert.equal(pkg.devDependencies["typescript-eslint-parser"], undefined);
  assert.equal(pkg.devDependencies["@typescript-eslint/parser"], "^8.72.0");
  assert.equal(pkg.devDependencies["@typescript-eslint/eslint-plugin"], "^8.72.0");
  assert.match(eslintConfig, /require\("@typescript-eslint\/parser"\)/);
  assert.match(eslintConfig, /require\("@typescript-eslint\/eslint-plugin"\)/);
});

test("pnpm lock removes the obsolete parser and vulnerable semver 5.5.0", () => {
  assert.ok(!lock.includes("\n  typescript-eslint-parser@22.0.0:"));
  assert.ok(!lock.includes("\n  typescript-estree@18.0.0:"));
  assert.ok(!lock.includes("\n  semver@5.5.0:"));
  const importer = lock.split("\n  packages/permissions:\n")[1]?.split("\n  packages/")[0] || "";
  assert.match(importer, /'@typescript-eslint\/parser':/);
  assert.match(importer, /'@typescript-eslint\/eslint-plugin':/);
  assert.doesNotMatch(importer, /typescript-eslint-parser:/);
});

test("temporary write-enabled generator must be absent from merge candidate", () => {
  assert.equal(fs.existsSync(path.join(root,
    ".github/workflows/permissions-parser-lock-generator.yml")), false);
});
