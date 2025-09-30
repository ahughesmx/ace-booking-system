-- Make user names visible on public display via a SECURITY DEFINER helper and view refresh

-- 1) Create a helper that returns full_name bypassing RLS for public display use only
create or replace function public.get_user_full_name_public(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name
  from public.profiles p
  where p.id = uid
$$;

-- 2) Recreate the public display view to use the helper (keeps public readability)
create or replace view public.public_bookings_display as
select 
  b.id,
  b.court_id,
  b.start_time,
  b.end_time,
  b.status,
  c.name as court_name,
  c.court_type,
  public.get_user_full_name_public(b.user_id) as user_display_name
from public.bookings b
left join public.courts c on c.id = b.court_id;