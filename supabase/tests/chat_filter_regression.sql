-- Manual regression corpus for the authoritative chat filter.
-- Run after the chat-filter migrations; the DO block raises on any mismatch.
do $test$
declare
  r record;
  actual boolean;
begin
  for r in
    select * from (values
      ('fuckk',true),('fuckkkk',true),('ffuck',true),('fuucckk',true),
      ('f.u.c.k',true),('f u c k',true),('fuckerrrr',true),('fuckinggg',true),
      ('motherfuckerrr',true),('shiiit',true),('shhiiittt',true),
      ('bitchh',true),('cuntt',true),('wankerrr',true),('assshole',true),
      ('niggerr',true),('nigggerrr',true),('fagggottt',true),('kysss',true),
      ('class',false),('Dickens',false),('Niger',false),
      ('shiitake mushroom',false),('assessment',false),('bookkeeper',false),
      ('grass',false),('prickly pear',false)
    ) as x(body,should_block)
  loop
    actual := public.cellbound_chat_block_reason(r.body) is not null;
    if actual is distinct from r.should_block then
      raise exception 'chat filter regression for "%": expected %, got %',
        r.body, r.should_block, actual;
    end if;
  end loop;
end
$test$;
