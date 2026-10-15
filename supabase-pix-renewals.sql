create table public.mystream_pix_renewals(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 cycle_key text not null,request_id uuid not null unique,order_id text unique,
 payer_email text not null,amount numeric(12,2) not null check(amount>0),
 status text not null default 'creating',paid boolean not null default false,granted_at timestamptz,
 created_at timestamptz not null default now(),unique(user_id,cycle_key));
alter table public.mystream_pix_renewals enable row level security;
revoke all on public.mystream_pix_renewals from public,anon,authenticated;
grant all on public.mystream_pix_renewals to service_role;
create function public.mystream_activate_pix_renewal(p_id uuid) returns timestamptz
language plpgsql security invoker set search_path='' as $$
declare p public.mystream_pix_renewals%rowtype; until_date timestamptz;
begin
 select * into p from public.mystream_pix_renewals where id=p_id for update;
 if not found or not p.paid then raise exception 'payment_not_confirmed'; end if;
 if p.granted_at is not null then
  select pro_until into until_date from public.mystream_subscriptions where user_id=p.user_id;
  return until_date;
 end if;
 insert into public.mystream_subscriptions(user_id,status,pro_until,updated_at)
 values(p.user_id,'pix_paid',now()+interval '30 days',now())
 on conflict(user_id) do update set status=case when public.mystream_subscriptions.mp_preapproval_id is not null then public.mystream_subscriptions.status else 'pix_paid' end,
 pro_until=greatest(coalesce(public.mystream_subscriptions.pro_until,now()),now())+interval '30 days',updated_at=now()
 returning pro_until into until_date;
 update public.mystream_pix_renewals set granted_at=now() where id=p_id;
 return until_date;
end $$;
revoke all on function public.mystream_activate_pix_renewal(uuid) from public,anon,authenticated;
grant execute on function public.mystream_activate_pix_renewal(uuid) to service_role;
