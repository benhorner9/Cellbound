-- Initial repeated-character evasion hardening.
-- The follow-up migration immediately below extends the same rule to repeated
-- suffix letters. This file intentionally uses the converged definition so a
-- fresh database reaches the production behavior even if migrations are replayed.
create or replace function public.cellbound_chat_block_reason(p_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v text := lower(coalesce(p_body,''));
begin
  v := replace(v,'0','o');
  v := replace(v,'1','i');
  v := replace(v,'3','e');
  v := replace(v,'4','a');
  v := replace(v,'5','s');
  v := replace(v,'7','t');
  v := replace(v,'@','a');
  v := replace(v,'$','s');
  v := replace(v,'!','i');

  if v ~ '(^|[^a-z0-9])f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(i+[^a-z0-9]*n+[^a-z0-9]*g+|e+[^a-z0-9]*d+|e+[^a-z0-9]*r+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])m+[^a-z0-9]*o+[^a-z0-9]*t+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(i+[^a-z0-9]*n+[^a-z0-9]*g+|e+[^a-z0-9]*d+|e+[^a-z0-9]*r+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+([^a-z0-9]*(t+[^a-z0-9]*y+|t+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*g+|t+[^a-z0-9]*e+[^a-z0-9]*d+|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*u+[^a-z0-9]*l+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])c+[^a-z0-9]*u+[^a-z0-9]*n+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*c+[^a-z0-9]*h+([^a-z0-9]*(e+[^a-z0-9]*s+|i+[^a-z0-9]*n+[^a-z0-9]*g+|y+|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])w+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])t+[^a-z0-9]*w+[^a-z0-9]*a+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])a+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])a+[^a-z0-9]*r+[^a-z0-9]*s+[^a-z0-9]*e+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])d+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(h+[^a-z0-9]*e+[^a-z0-9]*a+[^a-z0-9]*d+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])p+[^a-z0-9]*r+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
  then
    return 'profanity';
  end if;

  if v ~ '(^|[^a-z0-9])n+[^a-z0-9]*i+[^a-z0-9]*g{2,}[^a-z0-9]*(e+[^a-z0-9]*r+|a+)([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])f+[^a-z0-9]*a+[^a-z0-9]*g+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])p+[^a-z0-9]*a+[^a-z0-9]*k+[^a-z0-9]*i+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])r+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+([^a-z0-9]*(e+[^a-z0-9]*d+|s+))?([^a-z0-9]|$)'
  then
    return 'slur';
  end if;

  if regexp_replace(v,'[^a-z0-9]+','','g') ~ '(k+y+s+|k+i+l+l+y+o+u+r+s+e+l+f+)' then
    return 'abusive_phrase';
  end if;

  return null;
end;
$function$;
