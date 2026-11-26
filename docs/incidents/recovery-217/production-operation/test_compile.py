"""Contracts for the new target guard and atomic transaction boundaries."""
import copy
import importlib.util
from pathlib import Path
import re
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('atomic217', HERE / 'compile.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
PLAN = {'format': 'target-bound-atomic-217-v1',
        'targetRef': 'abcdefghijklmnopqrst', 'database': 'restored', 'connectionKind': 'direct',
        'catalogSha256': 'a' * 64, 'backupEvidenceSha256': 'b' * 64,
        'sourceMain': 'c' * 40}


class AtomicContracts(unittest.TestCase):
    def test_default_output_rolls_back_all_ten_families(self):
        out = c.render(PLAN)
        sql = out['sql']
        self.assertEqual(len(re.findall(r'^BEGIN ISOLATION LEVEL READ COMMITTED;$', sql, re.M)), 1)
        self.assertEqual(len(re.findall(r'^ROLLBACK;$', sql, re.M)), 1)
        self.assertNotRegex(sql, r'(?m)^COMMIT;$')
        self.assertEqual(re.findall(r'^-- FAMILY ([A-J])$', sql, re.M), list('ABCDEFGHIJ'))

    def test_operation_is_bound_to_plan_and_finish_is_explicit(self):
        original = c.render(PLAN)
        for field in PLAN:
            if field == 'format':
                continue
            changed = copy.deepcopy(PLAN)
            changed[field] = {'targetRef': 'bcdefghijklmnopqrstu', 'database': 'postgres',
                              'connectionKind': 'session-pooler',
                              'catalogSha256': 'd' * 64, 'backupEvidenceSha256': 'e' * 64,
                              'sourceMain': 'f' * 40}[field]
            self.assertNotEqual(c.render(changed)['operationSha256'], original['operationSha256'])
        committed = c.render(PLAN, 'commit')
        self.assertEqual(original['operationSha256'], committed['operationSha256'])
        self.assertEqual(original['sql'].removesuffix('ROLLBACK;\n'),
                         committed['sql'].removesuffix('COMMIT;\n'))

    def test_exact_managed_sql_survives_boundary_replacement(self):
        module, families = c.load_families()
        sql = c.render(PLAN)['sql']
        for family in families:
            expected = family['sql'].replace(module.GUARD,
                '-- Target and baseline checked by outer transaction.', 1)
            expected = expected.replace('-- #217 managed caller rehearsal; OWNED CLONE ONLY.\n', '')
            for boundary in ('BEGIN;', 'COMMIT;'):
                expected = re.sub(r'^' + boundary + r'\n', '', expected, count=1, flags=re.M)
            self.assertIn('-- FAMILY ' + family['name'] + '\n' + expected, sql)

    def test_invalid_or_injected_plan_rejected(self):
        for field, value in [('database', "postgres';COMMIT;--"),
                             ('catalogSha256', 'x' * 64), ('targetRef', 'unverified')]:
            plan = {**PLAN, field: value}
            with self.assertRaises(ValueError):
                c.render(plan)
        with self.assertRaises(ValueError):
            c.render({**PLAN, 'skipGuard': True})
        with self.assertRaises(ValueError):
            c.render(PLAN, 'skip')

    def test_changed_managed_compiler_refused(self):
        real_read = c.read
        with patch.object(c, 'read', side_effect=lambda path:
                          real_read(path) + ('\n' if path == c.MANAGED / 'compile.py' else '')):
            with self.assertRaisesRegex(ValueError, 'managed_input_changed'):
                c.render(PLAN)

    def test_catalog_is_part_of_operation_identity(self):
        real_read = c.read
        before = c.render(PLAN)['operationSha256']
        with patch.object(c, 'read', side_effect=lambda path:
                          real_read(path).replace('Stable metadata only', 'Metadata contract')
                          if path == c.HERE / 'catalog.sql' else real_read(path)):
            self.assertNotEqual(c.render(PLAN)['operationSha256'], before)


if __name__ == '__main__':
    unittest.main()
