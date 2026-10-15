-- MyStream Pro: assinaturas, cota de armazenamento e limite de playlists.
-- Rode DEPOIS do supabase-schema.sql, no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- 1) Assinaturas. Só o servidor (service role) escreve; o usuário só lê a própria linha.
create table if not exists public.mystream_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mp_preapproval_id text unique,
 status text not null default 'none',          -- none | pending | authorized | paused | cancelled
 pro_until timestamptz,                         -- acesso Pro vale até esta data
 updated_at timestamptz not null default now()
);
alter table public.mystream_subscriptions enable row level security;
revoke all on public.mystream_subscriptions from anon, authenticated;
grant select on public.mystream_subscriptions to authenticated;
drop policy if exists mystream_sub_read_own on public.mystream_subscriptions;
create policy mystream_sub_read_own on public.mystream_subscriptions for select to authenticated using ((select auth.uid()) = user_id);

-- 2) O usuário é Pro?
create or replace function public.mystream_is_pro(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select coalesce((select pro_until > now() from public.mystream_subscriptions where user_id = uid), false);
$$;
revoke all on function public.mystream_is_pro(uuid) from public, anon, authenticated;
grant execute on function public.mystream_is_pro(uuid) to service_role;

-- 3) Bytes usados no bucket privado (somente o servidor consulta).
create or replace function public.mystream_storage_used(uid uuid) returns bigint
language sql stable security definer set search_path = public, storage as $$
 select coalesce(sum((metadata->>'size')::bigint), 0)::bigint
 from storage.objects
 where bucket_id = 'mystream-media' and (storage.foldername(name))[1] = uid::text;
$$;
revoke all on function public.mystream_storage_used(uuid) from public, anon, authenticated;
grant execute on function public.mystream_storage_used(uuid) to service_role;

-- 4) Limite de playlists no plano grátis (5). Bloqueia criar além do limite;
--    quem cancelar o Pro mantém as que já tem e pode editá-las.
create or replace function public.mystream_enforce_playlist_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare novo int; antigo int := 0;
begin
 novo := coalesce(jsonb_array_length(new.state->'playlists'), 0);
 if tg_op = 'UPDATE' then antigo := coalesce(jsonb_array_length(old.state->'playlists'), 0); end if;
 if novo > 5 and novo > antigo and not public.mystream_is_pro(new.user_id) then
  raise exception 'playlist_limit' using errcode = 'P0001', hint = 'O plano gratuito permite até 5 playlists.';
 end if;
 return new;
end $$;
drop trigger if exists mystream_playlist_limit on public.mystream_user_state;
create trigger mystream_playlist_limit before insert or update on public.mystream_user_state
 for each row execute function public.mystream_enforce_playlist_limit();

-- 5) Uploads agora passam por um ticket emitido pelo servidor (que confere a cota).
--    Removemos o INSERT direto para que ninguém contorne o limite.
drop policy if exists mystream_media_insert on storage.objects;
