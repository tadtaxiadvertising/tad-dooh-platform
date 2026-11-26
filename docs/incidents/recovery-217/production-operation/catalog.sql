-- Stable metadata only: no application rows, passwords or connection strings.
SELECT jsonb_build_object(
  'relations', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,c.relname,
    c.relkind,pg_get_userbyid(c.relowner),c.relrowsecurity,c.relforcerowsecurity,
    c.relacl::text) ORDER BY n.nspname,c.relname),'[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')),
  'columns', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,a.attname,
    format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,
    pg_get_expr(d.adbin,d.adrelid),a.attacl::text) ORDER BY c.relname,a.attnum),'[]'::jsonb)
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped),
  'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,x.conname,
    pg_get_constraintdef(x.oid,true),x.convalidated) ORDER BY c.relname,x.conname),'[]'::jsonb)
    FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
  'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,i.relname,
    pg_get_indexdef(x.indexrelid),x.indisvalid,x.indisready) ORDER BY c.relname,i.relname),'[]'::jsonb)
    FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid
    JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'),
  'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,t.tgname,
    pg_get_triggerdef(t.oid,true),t.tgenabled) ORDER BY c.relname,t.tgname),'[]'::jsonb)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
  'policies', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,p.polname,
    p.polcmd,p.polpermissive,p.polroles::text,pg_get_expr(p.polqual,p.polrelid),
    pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY c.relname,p.polname),'[]'::jsonb)
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
  'routines', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,p.proname,
    pg_get_function_identity_arguments(p.oid),pg_get_userbyid(p.proowner),p.proacl::text,
    p.prosecdef,p.proconfig::text,md5(pg_get_functiondef(p.oid)))
    ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','extensions') AND p.prokind IN ('f','p')),
  'enums', (SELECT coalesce(jsonb_agg(jsonb_build_array(t.typname,e.enumlabel,
    e.enumsortorder) ORDER BY t.typname,e.enumsortorder),'[]'::jsonb)
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public'),
  'extensions', (SELECT coalesce(jsonb_agg(jsonb_build_array(e.extname,e.extversion,
    n.nspname,pg_get_userbyid(e.extowner)) ORDER BY e.extname),'[]'::jsonb)
    FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
  'views', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,
    pg_get_viewdef(c.oid,true)) ORDER BY c.relname),'[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m')),
  'roles', (SELECT coalesce(jsonb_agg(jsonb_build_array(rolname,rolsuper,rolinherit,
    rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls,rolconnlimit,
    md5(coalesce(rolconfig::text,''))) ORDER BY rolname),'[]'::jsonb) FROM pg_roles),
  'memberships', (SELECT coalesce(jsonb_agg(jsonb_build_array(
    pg_get_userbyid(roleid),pg_get_userbyid(member),pg_get_userbyid(grantor),
    admin_option,inherit_option,set_option) ORDER BY roleid,member,grantor),'[]'::jsonb)
    FROM pg_auth_members),
  'defaultAcls', (SELECT coalesce(jsonb_agg(jsonb_build_array(pg_get_userbyid(d.defaclrole),
    n.nspname,d.defaclobjtype,d.defaclacl::text) ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype),'[]'::jsonb)
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace)
) AS catalog;
