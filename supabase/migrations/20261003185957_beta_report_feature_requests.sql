alter table public.beta_reports
  drop constraint if exists beta_reports_category_check;

alter table public.beta_reports
  add constraint beta_reports_category_check
  check (category = any (array[
    'bug'::text,
    'feature'::text,
    'ui'::text,
    'balance'::text,
    'account'::text,
    'other'::text
  ]));
