create table if not exists public.mystream_user_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
 updated_at timestamptz not null default now()
);
alter table public.mystream_user_state enable row level security;
revoke all on public.mystream_user_state from anon;
grant select, insert, update, delete on public.mystream_user_state to authenticated;
create policy mystream_read_own on public.mystream_user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy mystream_insert_own on public.mystream_user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy mystream_update_own on public.mystream_user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy mystream_delete_own on public.mystream_user_state for delete to authenticated using ((select auth.uid()) = user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('mystream-media','mystream-media',false,52428800,array['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac','video/mp4','video/webm','video/quicktime','video/ogg'])
 on conflict(id) do nothing;
create policy mystream_media_read on storage.objects for select to authenticated using (bucket_id='mystream-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy mystream_media_insert on storage.objects for insert to authenticated with check (bucket_id='mystream-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy mystream_media_delete on storage.objects for delete to authenticated using (bucket_id='mystream-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
alter table public.midias enable row level security;
do $$ declare pol record; begin for pol in select policyname from pg_policies where schemaname='public' and tablename='midias' loop execute format('drop policy %I on public.midias',pol.policyname); end loop; end $$;
revoke all on public.midias from anon;
create policy mystream_midias_own on public.midias for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

