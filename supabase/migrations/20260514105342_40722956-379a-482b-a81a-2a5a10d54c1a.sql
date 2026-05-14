create or replace function public.get_my_profile()
returns setof public.profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    return;
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    v_profile := public.ensure_profile_for_user(v_uid);
  end if;

  return next v_profile;
end;
$$;

revoke execute on function public.get_my_profile() from public, anon;
revoke execute on function public.ensure_profile_for_user(uuid, text, text) from public, anon;
revoke execute on function public.generate_referral_code(uuid) from public, anon;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.ensure_profile_for_user(uuid, text, text) to authenticated;
grant execute on function public.generate_referral_code(uuid) to authenticated;