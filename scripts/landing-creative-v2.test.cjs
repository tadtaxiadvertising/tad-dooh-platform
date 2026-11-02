"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const appRequire = createRequire(
  path.join(root, "apps/advertiser/package.json"),
);
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const ts = appRequire("typescript");
const motion = appRequire("framer-motion");
const filename = path.join(root, "packages/ui/components/TextMorph.tsx");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

for (const preference of [null, true, false]) {
  test(`selected creative remains readable in server HTML with motion preference ${preference}`, () => {
    const module = { exports: {} };
    new Function("module", "exports", "require", compiled)(
      module,
      module.exports,
      (name) => {
        if (name === "framer-motion")
          return { ...motion, useReducedMotion: () => preference };
        assert.ok(
          ["react", "react/jsx-runtime"].includes(name),
          "unexpected dependency " + name,
        );
        return appRequire(name);
      },
    );
    const html = renderToStaticMarkup(
      React.createElement(
        module.exports.TextMorph,
        { className: "example" },
        "CAFÉ TAD",
      ),
    );
    assert.ok(
      html.includes("CAFÉ TAD"),
      "accessible label must remain in server HTML",
    );
    assert.doesNotMatch(
      html,
      /opacity:\s*0(?:[;"\s]|$)/,
      "initial SSR letters must not disappear",
    );
    assert.doesNotMatch(
      html,
      /visibility:\s*hidden|display:\s*none/,
      "selected label must not be hidden",
    );
    if (preference !== false)
      assert.equal(html, '<span class="example">CAFÉ TAD</span>');
  });
}
