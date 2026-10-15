create table if not exists public.mystream_pix_tests (user_id uuid primary key references auth.users(id) on delete cascade, request_id uuid not null unique, payer_email text not null, order_id text unique, status text not null default 'creating', paid boolean not null default false, updated_at timestamptz not null default now());
alter table public.mystream_pix_tests enable row level security;
revoke all on public.mystream_pix_tests from public,anon,authenticated;
grant all on public.mystream_pix_tests to service_role;
