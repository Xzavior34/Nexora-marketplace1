
-- Smart Match: rank open tasks for a given user
create or replace function public.get_smart_matches(_user_id uuid, _limit int default 12)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  price_kobo bigint,
  location text,
  deadline timestamptz,
  created_at timestamptz,
  poster_id uuid,
  poster_name text,
  poster_avatar text,
  poster_university text,
  match_score int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _skills text[];
  _university text;
begin
  select coalesce(skills, '{}'), university
    into _skills, _university
  from profiles
  where id = _user_id;

  return query
  select
    t.id,
    t.title,
    t.description,
    t.category,
    t.price_kobo,
    t.location,
    t.deadline,
    t.created_at,
    t.poster_id,
    p.full_name as poster_name,
    p.avatar_url as poster_avatar,
    p.university as poster_university,
    (
      -- Skill match (up to 60 pts)
      least(
        60,
        case when coalesce(array_length(_skills, 1), 0) = 0 then 25
        else
          (
            select count(*)::int
            from unnest(_skills) s
            where position(lower(s) in lower(coalesce(t.title,'') || ' ' || coalesce(t.description,'') || ' ' || coalesce(t.category,''))) > 0
          ) * 60 / greatest(array_length(_skills, 1), 1)
        end
      )
      -- University affinity (up to 25 pts)
      + case
          when _university is not null and p.university = _university then 25
          when _university is not null and p.university is not null then 10
          else 8
        end
      -- Freshness boost (up to 15 pts)
      + case
          when t.created_at > now() - interval '24 hours' then 15
          when t.created_at > now() - interval '3 days' then 10
          when t.created_at > now() - interval '7 days' then 6
          else 2
        end
    )::int as match_score
  from tasks t
  join profiles p on p.id = t.poster_id
  where t.status = 'open'
    and t.poster_id <> _user_id
  order by match_score desc, t.created_at desc
  limit _limit;
end;
$$;

grant execute on function public.get_smart_matches(uuid, int) to authenticated;

-- Squad Trust Score (300-850)
create or replace function public.get_squad_trust_score(_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _completed int := 0;
  _rating numeric := 0;
  _verified boolean := false;
  _recent int := 0;
  _score int := 300;
begin
  select coalesce(completed_gigs, 0),
         coalesce(average_rating, 0),
         coalesce(is_verified, false)
    into _completed, _rating, _verified
  from profiles
  where id = _user_id;

  -- Recent on-platform activity (last 30 days)
  select count(*)::int into _recent
  from tasks
  where (poster_id = _user_id or assignee_id = _user_id)
    and created_at > now() - interval '30 days';

  _score := 300
    + least(300, _completed * 12)
    + (_rating * 50)::int
    + case when _verified then 50 else 0 end
    + least(50, _recent * 5);

  if _score > 850 then _score := 850; end if;
  if _score < 300 then _score := 300; end if;

  return _score;
end;
$$;

grant execute on function public.get_squad_trust_score(uuid) to authenticated;
