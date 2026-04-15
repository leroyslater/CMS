create table if not exists public.chronicle_entries (
  id text primary key,
  entry_id text,
  student_code text not null references public.students(student_code),
  chronicle_type text,
  occurred_timestamp text,
  occurred_at timestamp without time zone,
  details text,
  original_publisher text,
  week_key text,
  week_label text,
  created_at timestamp with time zone not null default now()
);

alter table public.chronicle_entries enable row level security;

drop policy if exists "chronicle_entries_select_authenticated" on public.chronicle_entries;
drop policy if exists "chronicle_entries_insert_authenticated" on public.chronicle_entries;
drop policy if exists "chronicle_entries_update_authenticated" on public.chronicle_entries;

create policy "chronicle_entries_select_authenticated"
on public.chronicle_entries
for select
to authenticated
using (true);

create policy "chronicle_entries_insert_authenticated"
on public.chronicle_entries
for insert
to authenticated
with check (true);

create policy "chronicle_entries_update_authenticated"
on public.chronicle_entries
for update
to authenticated
using (true)
with check (true);
