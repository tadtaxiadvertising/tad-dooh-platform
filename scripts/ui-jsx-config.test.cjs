"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("shared UI compiles JSX with the React automatic runtime", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../packages/ui/tsconfig.json"), "utf8"));
  const root = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../tsconfig.base.json"), "utf8"));
  assert.equal(root.compilerOptions.jsx, "react");
  assert.equal(pkg.compilerOptions.jsx, "react-jsx");
  assert.equal(pkg.compilerOptions.noEmit, true);
  assert.equal(pkg.compilerOptions.skipLibCheck, true);
});
