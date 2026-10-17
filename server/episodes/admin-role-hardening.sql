-- Missing admin rows must fail closed. This changes no saves or episode access.
do $$
declare f record; definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('cellbound_admin_fresh_start_player','cellbound_admin_max_player') loop
  definition=pg_get_functiondef(f.oid);
  if position('if v_role not in (' in definition)>0 then
   execute replace(definition,'if v_role not in (','if v_role is null or v_role not in (');
  end if;
 end loop;
end $$;
