"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "easypanel-host-triage.sh");
const src = fs.readFileSync(script, "utf8");

test("triage is valid POSIX shell syntax", () => {
  const run = spawnSync("/bin/sh", ["-n", script], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("triage contains only observation commands, no repair or secret dumps", () => {
  const statements = src.split("\n").filter((l) => !/^\s*(#|$)/.test(l)).join("\n");
  assert.doesNotMatch(statements, /\b(docker\s+(?:service\s+(?:update|rm)|system\s+prune|swarm\s+leave|restart|kill|stop)|reboot|shutdown|rm\s+-rf|migrate\s+(?:deploy|reset|resolve)|prisma\s+db\s+push|printenv|env\s*\||set\s+-x)\b/i);
  assert.match(src, /docker service ps easypanel/);
  assert.match(src, /docker service ps traefik/);
  assert.match(src, /run_check 'Memory and swap/);
  assert.match(src, /run_check 'Disk capacity/);
  assert.match(src, /run_check 'Inode capacity/);
});

test("synthetic provider-console run never prints environment secrets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-easypanel-triage-"));
  try {
    for (const cmd of ["date", "uptime", "free", "df", "systemctl", "docker", "journalctl"]) {
      fs.writeFileSync(path.join(dir, cmd), "#!/bin/sh\nprintf 'mock-" + cmd + "\\n'\n", { mode: 0o700 });
    }
    fs.writeFileSync(path.join(dir, "timeout"), "#!/bin/sh\nshift\nexec \"$@\"\n", { mode: 0o700 });
    const secret = "PRIVATE_TAD_TEST_ONLY_DO_NOT_LOG";
    const run = spawnSync("/bin/sh", [script], {
      encoding: "utf8", timeout: 5000,
      env: { PATH: dir + ":/usr/bin:/bin", DATABASE_URL: secret, JWT_SECRET: secret },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /mock-docker/);
    assert.doesNotMatch(run.stdout + run.stderr, new RegExp(secret));
    assert.match(run.stdout, /No containers, volumes, databases, services or images were changed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
