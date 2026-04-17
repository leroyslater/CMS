alter table public.profiles
add column if not exists year_levels text[] default '{}'::text[];
