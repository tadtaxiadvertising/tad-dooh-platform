#!/usr/bin/env python3
"""Offline behavioral checks for the local fast gate; no Node tools execute."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


CANDIDATE = Path(__file__).resolve().with_name("run_fast_gates.py")


class FastGateTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tad fast gate ")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve() / "isolated checkout with spaces"
        self.script = self.root / "scripts/run_fast_gates.py"
        self.script.parent.mkdir(parents=True)
        shutil.copyfile(CANDIDATE, self.script)
        self.scratch = self.root / "private scratch"
        self.tools = (
            self.root / "node_modules/typescript/bin/tsc",
            self.root / "apps/api/node_modules/eslint/bin/eslint.js",
            self.root / "node_modules/eslint/bin/eslint.js",
        )
        for tool in self.tools:
            tool.parent.mkdir(parents=True, exist_ok=True)
            tool.write_text("fixture only", encoding="utf-8")
        (self.root / "apps/api/src").mkdir(parents=True)
        for directory in ("components", "contexts", "hooks", "lib", "pages", "store",
                          "styles", "tests", "types", "utils", "public", "docs"):
            (self.root / "apps/driver" / directory).mkdir(parents=True)
        for workspace in ("api", "driver"):
            (self.root / f"apps/{workspace}/eslint.config.mjs").write_text(
                "export default [];", encoding="utf-8",
            )

    def load_gate(self):
        spec = importlib.util.spec_from_file_location("fast_gate_fixture", self.script)
        gate = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, {"HERMES_SCRATCH": str(self.scratch)}), \
                patch("subprocess.run", return_value=subprocess.CompletedProcess([], 0, "", "")) as child, \
                contextlib.redirect_stdout(io.StringIO()):
            spec.loader.exec_module(gate)
        return gate, child

    def run_main(self, gate, runner):
        output = io.StringIO()
        with patch.dict(os.environ, {"HERMES_SCRATCH": str(self.scratch)}), \
                patch("subprocess.run", side_effect=runner), \
                contextlib.redirect_stdout(output):
            code = gate.main()
        return code, output.getvalue()

    def test_import_does_not_run_tools_or_create_reports(self):
        gate, child = self.load_gate()
        child.assert_not_called()
        self.assertFalse(self.scratch.exists())
        self.assertTrue(callable(gate.main))

    def test_success_uses_the_script_checkout_and_workspace_configs(self):
        gate, _ = self.load_gate()
        calls = []

        def succeed(command, **options):
            calls.append((command, options))
            if command[1].endswith("eslint.js"):
                cwd = Path(options["cwd"])
                for target in command[2:command.index("--config")]:
                    if not (cwd / target).exists():
                        return subprocess.CompletedProcess(command, 2, "", f"Missing lint target: {target}")
                self.assertTrue((cwd / "eslint.config.mjs").is_file())
            return subprocess.CompletedProcess(command, 0, "fixture check passed", "")

        code, output = self.run_main(gate, succeed)
        self.assertEqual(code, 0, output)
        self.assertIn("ALL FAST GATES PASS", output)
        self.assertEqual(len(calls), 3)
        self.assertEqual([Path(options["cwd"]) for _, options in calls], [
            self.root, self.root / "apps/api", self.root / "apps/driver",
        ])
        for command, options in calls:
            self.assertIsInstance(command, list)
            self.assertFalse(options.get("shell", False))
            self.assertIn(str(self.root), command[1])
        for command, options in calls[1:]:
            self.assertEqual(command[command.index("--config") + 1], "eslint.config.mjs")
            self.assertEqual(command[command.index("--format") + 1], "stylish")
            self.assertEqual(command[command.index("--max-warnings") + 1], "0")
            self.assertEqual(options["env"]["ESLINT_USE_FLAT_CONFIG"], "true")
        self.assertEqual(len(list((self.scratch / "fastgate-results").glob("*.txt"))), 3)

    def test_a_failed_check_still_reports_remaining_checks_and_returns_failure(self):
        gate, _ = self.load_gate()
        calls = []

        def fail_typecheck(command, **options):
            calls.append(command)
            return subprocess.CompletedProcess(command, 7 if len(calls) == 1 else 0, "", "fixture failure")

        code, output = self.run_main(gate, fail_typecheck)
        self.assertEqual(code, 1)
        self.assertEqual(len(calls), 3)
        self.assertIn("SOME GATES FAIL", output)
        report = (self.scratch / "fastgate-results/tsc-check.txt").read_text(encoding="utf-8")
        self.assertIn("RC: 7", report)

    def test_missing_required_eslint_file_fails_instead_of_skipping(self):
        self.tools[1].unlink()
        gate, _ = self.load_gate()
        calls = []

        def succeed(command, **options):
            calls.append(command)
            return subprocess.CompletedProcess(command, 0, "", "")

        code, output = self.run_main(gate, succeed)
        self.assertEqual(code, 1)
        self.assertEqual(len(calls), 2)
        self.assertIn("eslint_api: FAIL", output)
        self.assertNotIn("N/A", output)
        report = (self.scratch / "fastgate-results/eslint-api.txt").read_text(encoding="utf-8")
        self.assertIn("Required tool file is unavailable", report)

    def test_cli_exit_status_for_success_failure_missing_executable_and_timeout(self):
        # A fresh Python process executes the real CLI entrypoint. Its child
        # runner is replaced before loading the script, so Node cannot execute.
        wrapper = """
import runpy, subprocess, sys
from pathlib import Path
mode = sys.argv[2]
def fixture(command, **options):
    if mode == 'missing':
        raise FileNotFoundError('fixture node unavailable')
    if mode == 'timeout':
        raise subprocess.TimeoutExpired(command, options['timeout'])
    if command[1].endswith('eslint.js'):
        for target in command[2:command.index('--config')]:
            if not (Path(options['cwd']) / target).exists():
                return subprocess.CompletedProcess(command, 2, '', 'Missing lint target: ' + target)
    return subprocess.CompletedProcess(command, 7 if mode == 'failure' else 0, '', '')
subprocess.run = fixture
runpy.run_path(sys.argv[1], run_name='__main__')
"""
        for mode, expected in (("success", 0), ("failure", 1), ("missing", 1), ("timeout", 1)):
            with self.subTest(mode=mode):
                result = subprocess.run(
                    [sys.executable, "-c", wrapper, str(self.script), mode],
                    cwd=self.temporary.name,
                    env={**os.environ, "HERMES_SCRATCH": str(self.scratch), "PYTHONIOENCODING": "utf-8"},
                    capture_output=True, text=True, encoding="utf-8", timeout=15,
                )
                self.assertEqual(result.returncode, expected, result.stderr)
                self.assertNotIn("Traceback", result.stderr)
                self.assertIn("ALL FAST GATES PASS" if expected == 0 else "SOME GATES FAIL", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
