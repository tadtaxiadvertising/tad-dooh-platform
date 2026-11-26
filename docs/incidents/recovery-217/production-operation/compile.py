"""Compile A-J into one target/baseline-bound transaction, defaulting to ROLLBACK.

Offline compiler, no DB access. A client MUST independently pin all three URLs,
require verified TLS and set the two session markers before executing output.
SQL markers are assertions from that client, not independent project identity.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
MANAGED = HERE.parent / 'managed-transition'
INPUTS = {
    'compile.py': 'af5d608e043edf2f19b1b8b6b824409d8c0346fc68c5aead5f12eb1d9c072fa4',
    'manifest.json': '9b96e21342e787cb1c7f2a17f61a3cb037e59b4f3998c5d06732d246f8526b0b',
}


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def read(path):
    return path.read_text(encoding='utf-8').replace('\r\n', '\n')


def load_families():
    for name, expected in INPUTS.items():
        if sha(read(MANAGED / name)) != expected:
            raise ValueError('managed_input_changed')
    spec = importlib.util.spec_from_file_location('managed217', MANAGED / 'compile.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, module.render_all()


def catalog_query():
    source = read(HERE / 'catalog.sql')
    source = re.sub(r'^--[^\n]*\n', '', source)
    if not source.startswith('SELECT ') or not source.endswith(' AS catalog;\n'):
        raise ValueError('catalog_query_shape_changed')
    return source.removesuffix(' AS catalog;\n')[7:]


def validate(plan):
    if set(plan) != {'format', 'targetRef', 'database', 'connectionKind', 'catalogSha256',
                     'backupEvidenceSha256', 'sourceMain'}:
        raise ValueError('plan_fields_invalid')
    if plan['format'] != 'target-bound-atomic-217-v1':
        raise ValueError('plan_format_invalid')
    if plan['connectionKind'] not in ('direct', 'session-pooler'):
        raise ValueError('connection_kind_invalid')
    for key, pattern in [('targetRef', r'[a-z0-9]{20}'),
                         ('database', r'[a-z_][a-z0-9_]{0,62}'),
                         ('catalogSha256', r'[a-f0-9]{64}'),
                         ('backupEvidenceSha256', r'[a-f0-9]{64}'),
                         ('sourceMain', r'[a-f0-9]{40}')]:
        if not isinstance(plan[key], str) or not re.fullmatch(pattern, plan[key]):
            raise ValueError('plan_value_invalid_' + key)


def render(plan, finish='rollback'):
    validate(plan)
    if finish not in ('rollback', 'commit'):
        raise ValueError('finish_invalid')
    module, families = load_families()
    catalog = catalog_query()
    identity = {'plan': plan, 'atomicCompilerSha256': sha(read(Path(__file__))),
                'clientLibrarySha256': sha(read(HERE / 'preflight.cjs')),
                'catalogQuerySha256': sha(read(HERE / 'catalog.sql')),
                'families': [{k: f[k] for k in ('name', 'renderedLfSha256')}
                             for f in families]}
    operation = sha(json.dumps(identity, sort_keys=True, separators=(',', ':')))
    header = f"""-- #217 ATOMIC CANDIDATE. Readiness and independent client pin still required.
-- Operation SHA256: {operation}
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='60s';
DO $target$ BEGIN
  IF current_database()<>'{plan['database']}' OR session_user<>'postgres'
    OR current_user<>'postgres'
    OR current_setting('tad.recovery_target',true) IS DISTINCT FROM '{plan['targetRef']}'
    OR current_setting('tad.recovery_operation',true) IS DISTINCT FROM '{operation}'
    OR current_setting('tad.recovery_client_tls',true) IS DISTINCT FROM 'strict'
    OR inet_server_addr() IS NULL
    OR ('{plan['connectionKind']}'='direct' AND
      NOT coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false))
    OR (SELECT rolsuper OR NOT rolbypassrls FROM pg_roles WHERE rolname=current_user)
    OR pg_has_role(current_user,'supabase_admin','SET')
    OR NOT pg_has_role(current_user,'supabase_privileged_role','USAGE')
    OR NOT pg_has_role(current_user,'pg_read_all_settings','USAGE')
    OR position(',supautils,' IN ','||replace(current_setting(
      'session_preload_libraries'),' ','')||',')=0 THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='target_bound_operation_required';
  END IF;
  IF NOT pg_try_advisory_xact_lock(217,20261125) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='recovery_operation_in_progress';
  END IF;
END $target$;
-- Prevent application writes to existing public tables until the transaction ends.
DO $locks$ DECLARE r record; BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname LOOP
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',r.relname);
  END LOOP;
END $locks$;
DO $baseline$ BEGIN
  IF encode(sha256(convert_to(({catalog})::text,'UTF8')),'hex')<>'{plan['catalogSha256']}' THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='catalog_baseline_changed';
  END IF;
END $baseline$;
"""
    bodies = []
    for f in families:
        source = f['sql']
        if source.count(module.GUARD) != 1:
            raise ValueError('managed_guard_changed')
        source = source.replace(module.GUARD, '-- Target and baseline checked by outer transaction.', 1)
        for boundary in ('BEGIN;', 'COMMIT;'):
            if len(re.findall(r'^' + boundary + r'$', source, re.M)) != 1:
                raise ValueError('family_boundary_invalid')
            source = re.sub(r'^' + boundary + r'\n', '', source, count=1, flags=re.M)
        # Replace only the clone-specific commentary; all remaining SQL is exact.
        source = source.replace('-- #217 managed caller rehearsal; OWNED CLONE ONLY.\n', '')
        bodies.append('-- FAMILY ' + f['name'] + '\n' + source)
    sql = header + '\n'.join(bodies) + '\n' + finish.upper() + ';\n'
    if re.search(r'^\s*SET\s+(?:LOCAL\s+)?ROLE\b', sql, re.M | re.I):
        raise ValueError('role_switch_in_atomic_operation')
    return {'operationSha256': operation, 'sqlLfSha256': sha(sql),
            'finish': finish, 'families': list('ABCDEFGHIJ'), 'sql': sql}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    # Commit rendering is available only to the owned-clone test harness. Shipping
    # an apply client requires independent recovery/configuration readiness proof.
    args = parser.parse_args()
    rendered = render(json.loads(args.plan.read_text(encoding='utf-8')))
    with args.out.open('x', encoding='utf-8', newline='\n') as f:
        f.write(rendered.pop('sql'))
    print(json.dumps(rendered))


if __name__ == '__main__':
    main()
