"""Offline falsification of the hash-locked, clone-only renderer."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('compiler_under_test',HERE/'compile.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)

class RenderContract(unittest.TestCase):
    def setUp(self):
        self.original_root=c.ROOT;self.original_here=c.HERE
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)/'recovery'
        self.here=self.root/'managed-transition'
        self.here.mkdir(parents=True)
        self.manifest=json.loads((HERE/'manifest.json').read_text())
        for family in self.manifest['families']:
            target=self.root/family['source'];target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text((self.original_root/family['source']).read_text(),encoding='utf-8')
        c.ROOT=self.root;c.HERE=self.here
        self.save()

    def tearDown(self):
        c.ROOT=self.original_root;c.HERE=self.original_here
        self.tmp.cleanup()

    def save(self):
        (self.here/'manifest.json').write_text(json.dumps(self.manifest),encoding='utf-8')

    def test_preserves_ten_family_order_and_transaction_bodies(self):
        result=c.render_all()
        self.assertEqual([x['name'] for x in result],list('ABCDEFGHIJ'))
        for family in result:
            source=(self.root/family['source']).read_text()
            sql=family['sql']
            # Only the scope block, known role statements, and the explanatory
            # comment may change; real DB tests check the resulting behavior.
            strip=lambda s:c.ROLE.sub('',c.SCOPE.sub('',s)).replace(
                '-- Extension installation requires the owned clone bootstrap. Existing managed',
                '-- Extension installation uses the managed supautils route. Existing managed')
            self.assertEqual(strip(sql).splitlines()[2:],strip(source).splitlines())
            self.assertIn("current_database()<>'restored'",sql)
            self.assertNotRegex(sql,r'(?m)^SET LOCAL ROLE ')

    def test_changed_source_is_rejected_before_rendering(self):
        p=self.root/self.manifest['families'][0]['source']
        p.write_text(p.read_text()+'\nALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;\n')
        with self.assertRaisesRegex(ValueError,'source_hash_mismatch_A'):c.render_all()

    def test_production_mode_is_rejected(self):
        self.manifest['mode']='production';self.save()
        with self.assertRaisesRegex(ValueError,'unsupported_scope'):c.render_all()

    def test_parent_path_is_rejected(self):
        self.manifest['families'][0]['source']='../outside.sql';self.save()
        with self.assertRaisesRegex(ValueError,'source_path_outside'):c.render_all()

    def test_reordering_is_rejected(self):
        self.manifest['families'][0],self.manifest['families'][1]=self.manifest['families'][1],self.manifest['families'][0]
        self.save()
        with self.assertRaisesRegex(ValueError,'family_order_invalid'):c.render_all()

    def test_new_role_switch_is_rejected_even_with_updated_source_hash(self):
        f=self.manifest['families'][0];p=self.root/f['source']
        body=p.read_text().replace('SET LOCAL ROLE postgres;','SET LOCAL ROLE supabase_admin;')
        p.write_text(body);f['sourceLfSha256']=c.sha(body);self.save()
        with self.assertRaisesRegex(ValueError,'source_role_statements_changed_A'):c.render_all()

if __name__=='__main__':unittest.main()
