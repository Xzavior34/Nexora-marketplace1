create or replace function public.generate_referral_code(_user_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
begin
  return upper(substr(replace(_user_id::text, '-', ''), 1, 8));
end;
$$;

create or replace function public.ensure_profile_for_user(
  _user_id uuid,
  _email text default null,
  _full_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_email text;
  v_name text;
begin
  if _user_id is null then
    raise exception 'Missing user id';
  end if;

  select u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
    into v_email, v_name
  from auth.users u
  where u.id = _user_id;

  v_email := coalesce(_email, v_email, 'user-' || left(_user_id::text, 8) || '@nexora.local');
  v_name := nullif(coalesce(_full_name, v_name, split_part(v_email, '@', 1)), '');

  insert into public.profiles (
    id,
    email,
    full_name,
    wallet_balance,
    is_verified,
    skills,
    completed_gigs,
    average_rating,
    has_completed_onboarding,
    is_ambassador,
    has_edited_referral,
    is_admin,
    spin_tickets,
    fake_completed_gigs,
    fake_posted_gigs,
    fake_reviews,
    vault_balance,
    auto_save_percentage,
    referral_code,
    created_at,
    updated_at
  ) values (
    _user_id,
    v_email,
    v_name,
    0,
    true,
    '{}'::text[],
    0,
    0,
    false,
    false,
    false,
    lower(v_email) = 'unigig60@gmail.com',
    0,
    0,
    0,
    0,
    0,
    5,
    public.generate_referral_code(_user_id),
    now(),
    now()
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_profile_for_user(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_my_profile()
returns setof public.profiles
language plpgsql
stable
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

insert into public.profiles (
  id,
  email,
  full_name,
  wallet_balance,
  is_verified,
  skills,
  completed_gigs,
  average_rating,
  has_completed_onboarding,
  is_ambassador,
  has_edited_referral,
  is_admin,
  spin_tickets,
  fake_completed_gigs,
  fake_posted_gigs,
  fake_reviews,
  vault_balance,
  auto_save_percentage,
  referral_code,
  created_at,
  updated_at
)
select
  u.id,
  coalesce(u.email, 'user-' || left(u.id::text, 8) || '@nexora.local'),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, 'Nexora User'), '@', 1)),
  0,
  true,
  '{}'::text[],
  0,
  0,
  false,
  false,
  false,
  lower(coalesce(u.email, '')) = 'unigig60@gmail.com',
  0,
  0,
  0,
  0,
  0,
  5,
  public.generate_referral_code(u.id),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists profiles_public_read_safe on public.profiles;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_self_read'
  ) then
    create policy profiles_self_read
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_self_insert'
  ) then
    create policy profiles_self_insert
    on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);
  end if;
end $$;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.ensure_profile_for_user(uuid, text, text) to authenticated;
grant execute on function public.generate_referral_code(uuid) to authenticated;