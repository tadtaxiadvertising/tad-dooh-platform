#!/usr/bin/env python3
"""Offline behavioral tests for the secure TAD critical API gate.
No real repo dependencies, network, databases or credentials.
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import tempfile
import unittest

CANDIDATE = Path(__file__).resolve().parent / 'critical-api-local-gate.sh'


class SecureGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tad-qa-gate-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for p in ('scripts', 'node_modules', 'apps/api/node_modules', 'bin'):
            (self.root / p).mkdir(parents=True, exist_ok=True)
        (self.root / 'scripts/critical-api-local-gate.sh').write_bytes(CANDIDATE.read_bytes())
        self.bin = self.root / 'bin'
        self.make_shim('node', '''#!/bin/sh
if [ "${1:-}" = "-p" ]; then echo "22"; exit 0; fi
printf 'CHECK_NODE_SECRETS=%s\n' "${SMTP_PASSWORD+present}${AWS_SECRET_ACCESS_KEY+present}${BASH_ENV+present}"
printf 'CHECK_NODE_HOME=%s\n' "$HOME"
exit 0
''')
        self.make_shim('pnpm', '''#!/bin/sh
if [ "${1:-}" = "--version" ]; then echo "10.34.9"; exit 0; fi
printf 'CHECK_PNPM_SECRETS=%s\n' "${SMTP_PASSWORD+present}${AWS_SECRET_ACCESS_KEY+present}${BASH_ENV+present}"
exit 0
''')
        self.env = {**os.environ,
                    'PATH': str(self.bin) + ':' + os.environ.get('PATH', '/usr/bin:/bin'),
                    'SMTP_PASSWORD': 'DUMMY_ONLY_SMTP',
                    'AWS_SECRET_ACCESS_KEY': 'DUMMY_ONLY_AWS',
                    'SENTINEL_NEW_PROVIDER_TOKEN': 'DUMMY_ONLY_PROVIDER'}

    def make_shim(self, name: str, content: str):
        target = self.bin / name
        target.write_text(content)
        target.chmod(0o755)

    def run_gate(self):
        return subprocess.run(['bash', str(self.root / 'scripts/critical-api-local-gate.sh')],
                              env=self.env, text=True, capture_output=True, timeout=20)

    def test_runs_no_secrets_under_allowlist(self):
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('PASS: critical API local gate', result.stdout)
        self.assertGreaterEqual(result.stdout.count('CHECK_NODE_SECRETS='), 1)
        self.assertGreaterEqual(result.stdout.count('CHECK_PNPM_SECRETS='), 1)
        self.assertNotIn('present', result.stdout)
        self.assertNotIn('DUMMY_ONLY', result.stdout)
        self.assertIn('CHECK_NODE_HOME=', result.stdout)

    def test_blocks_dotenv(self):
        (self.root / 'apps/api/.env.production').write_text('FAKE_NON_SECRET=1')
        result = self.run_gate()
        self.assertEqual(result.returncode, 2)
        self.assertIn('BLOCKED: environment file present', result.stderr)
        self.assertNotIn('CHECK_NODE_SECRETS', result.stdout)

    def test_blocks_symlinked_environment_files(self):
        # dotenv loaders follow symlinks. A symlink named .env must be treated
        # like a file, even if its target lives outside the checkout.
        with tempfile.TemporaryDirectory(prefix='tad-external-config-') as external:
            dummy = Path(external) / 'dummy-config'
            dummy.write_text('FAKE_NON_SECRET=1')
            for name in ('.env', 'apps/api/.env.production', '.envrc.local'):
                with self.subTest(name=name):
                    link = self.root / name
                    link.symlink_to(dummy)
                    try:
                        result = self.run_gate()
                        self.assertEqual(result.returncode, 2, result.stderr)
                        self.assertIn('BLOCKED: environment file present', result.stderr)
                        self.assertNotIn('CHECK_NODE_SECRETS', result.stdout)
                    finally:
                        link.unlink()

    def test_rejects_wrong_node(self):
        self.make_shim('node', '#!/bin/sh\nif [ "${1:-}" = "-p" ]; then echo 24; else exit 0; fi\n')
        result = self.run_gate()
        self.assertEqual(result.returncode, 2)
        self.assertIn('BLOCKED: expected Node.js 22', result.stderr)
        self.assertNotIn('CHECK_PNPM_SECRETS=', result.stdout)

    def test_rejects_missing_dependencies(self):
        (self.root / 'apps/api/node_modules').rmdir()
        result = self.run_gate()
        self.assertEqual(result.returncode, 2)
        self.assertIn('workspace dependencies missing', result.stderr)
        self.assertNotIn('CHECK_NODE_SECRETS=', result.stdout)

    def test_no_dotenv_whitelist_false_positive(self):
        (self.root / '.env.example').write_text('FAKE_NON_SECRET=1')
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
