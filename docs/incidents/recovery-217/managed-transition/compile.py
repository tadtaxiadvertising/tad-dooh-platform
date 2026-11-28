"""Render the reviewed #217 families for a managed caller in an owned clone.

No network, credentials, database client, or production mode. Original SQL files
and transaction boundaries stay unchanged. Outputs remain clone-only.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SCOPE = re.compile(r'DO \$scope\$[\s\S]*?\$scope\$;')
ROLE = re.compile(r'^SET LOCAL ROLE (postgres|supabase_admin);[ \t]*\n', re.M)
GUARD = """DO $scope$ BEGIN
  IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL
    OR session_user<>'postgres' OR current_user<>'postgres'
    OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'managed-clone-217'
    OR (SELECT rolsuper OR NOT rolbypassrls FROM pg_roles WHERE rolname=current_user)
    OR pg_has_role(current_user,'supabase_admin','SET')
    OR NOT pg_has_role(current_user,'supabase_privileged_role','USAGE')
    OR NOT pg_has_role(current_user,'pg_read_all_settings','USAGE')
    OR position(',supautils,' IN ','||replace(current_setting(
      'session_preload_libraries'),' ','')||',')=0 THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='managed_isolated_clone_required';
  END IF;
END $scope$;"""

def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def render_all():
    manifest = json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('mode') != 'owned-managed-clone-only':
        raise ValueError('unsupported_scope')
    result = []
    for family in manifest['families']:
        relative = Path(family['source'])
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('source_path_outside_recovery_root')
        path = (ROOT/relative).resolve(strict=True)
        if not path.is_relative_to(ROOT.resolve()):
            raise ValueError('source_path_outside_recovery_root')
        source = path.read_text(encoding='utf-8').replace('\r\n','\n')
        if sha(source) != family['sourceLfSha256']:
            raise ValueError('source_hash_mismatch_'+family['name'])
        if len(SCOPE.findall(source)) != 1:
            raise ValueError('source_scope_count_'+family['name'])
        roles = ROLE.findall(source)
        if roles != family['removedRoleStatements']:
            raise ValueError('source_role_statements_changed_'+family['name'])
        if 'supabase_admin' in roles and family['name'] != 'J':
            raise ValueError('unexpected_bootstrap_role')
        rendered = SCOPE.sub(lambda _:GUARD,source,count=1)
        rendered = ROLE.sub('',rendered)
        rendered = rendered.replace(
            '-- Extension installation requires the owned clone bootstrap. Existing managed\n',
            '-- Extension installation uses the managed supautils route. Existing managed\n')
        if re.search(r'^\s*SET\s+(?:LOCAL\s+)?ROLE\b',rendered,re.M|re.I):
            raise ValueError('role_switch_remaining_'+family['name'])
        for statement in ('BEGIN;', 'COMMIT;'):
            if len(re.findall(r'^'+statement+'$',rendered,re.M)) != 1:
                raise ValueError('transaction_boundary_changed_'+family['name'])
        rendered = ('-- #217 managed caller rehearsal; OWNED CLONE ONLY.\n'
                    '-- Source LF SHA256: '+family['sourceLfSha256']+'\n'+rendered)
        result.append({'name':family['name'],'source':family['source'],
                       'sql':rendered,'renderedLfSha256':sha(rendered)})
    if [x['name'] for x in result] != list('ABCDEFGHIJ'):
        raise ValueError('family_order_invalid')
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,required=True,
                        help='New output directory; existing directories are refused.')
    args = parser.parse_args()
    families = render_all()  # Validate every input before creating any output.
    args.out.mkdir(parents=True,exist_ok=False)
    for family in families:
        with (args.out/(family['name']+'.sql')).open('x',encoding='utf-8',newline='\n') as f:
            f.write(family['sql'])
    print(json.dumps({'mode':'owned-managed-clone-only','families':[
        {k:v for k,v in x.items() if k!='sql'} for x in families]}))

if __name__=='__main__':
    main()
