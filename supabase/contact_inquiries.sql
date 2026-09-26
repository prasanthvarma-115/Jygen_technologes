-- Run once in your own Supabase project's SQL editor.
-- Only the server-side secret key may access these inquiries.
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null check (char_length(first_name) between 1 and 90),
  last_name text not null check (char_length(last_name) between 1 and 90),
  email text not null check (char_length(email) between 3 and 180),
  company text not null default '',
  service text not null,
  details text not null check (char_length(details) between 10 and 5000),
  contact_ok boolean not null check (contact_ok = true),
  source text not null default 'jygen.tech',
  status text not null default 'new' check (status in ('new', 'reviewing', 'replied', 'closed'))
);

alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from anon, authenticated;
grant select, insert, update on public.contact_inquiries to service_role;
create index if not exists contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);
