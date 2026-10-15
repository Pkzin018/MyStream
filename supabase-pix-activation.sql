alter table public.mystream_pix_tests add column if not exists granted_at timestamptz;
create or replace function public.mystream_activate_paid_pix(p_user_id uuid, p_order_id text)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare p public.mystream_pix_tests%rowtype; until_date timestamptz;
begin
 select * into p from public.mystream_pix_tests where user_id=p_user_id and order_id=p_order_id for update;
 if not found or not p.paid then raise exception 'payment_not_confirmed'; end if;
 if p.granted_at is not null then
  select pro_until into until_date from public.mystream_subscriptions where user_id=p_user_id;
  return until_date;
 end if;
 insert into public.mystream_subscriptions(user_id,status,pro_until,updated_at)
 values(p_user_id,'pix_paid',now()+interval '30 days',now())
 on conflict(user_id) do update set
  status=case when public.mystream_subscriptions.mp_preapproval_id is not null then public.mystream_subscriptions.status else 'pix_paid' end,
  pro_until=greatest(public.mystream_subscriptions.pro_until,excluded.pro_until),updated_at=now()
 returning pro_until into until_date;
 update public.mystream_pix_tests set granted_at=now() where user_id=p_user_id;
 return until_date;
end $$;
revoke all on function public.mystream_activate_paid_pix(uuid,text) from public,anon,authenticated;
grant execute on function public.mystream_activate_paid_pix(uuid,text) to service_role;
