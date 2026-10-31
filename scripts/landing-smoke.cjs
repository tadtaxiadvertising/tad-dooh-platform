#!/usr/bin/env node
'use strict';
// Compatibility entry: the current public landing acceptance lives in V3.
require('./landing-v3-smoke.cjs').main().catch(error => {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
});
