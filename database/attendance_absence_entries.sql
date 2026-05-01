create table if not exists public.attendance_absence_entries (
  id text primary key,
  student_code text not null references public.students(student_code),
  start_time_text text,
  start_at timestamp without time zone,
  periods text,
  status_name text,
  status_code text,
  status_description text,
  week_key text,
  week_label text,
  created_at timestamp with time zone not null default now()
);

alter table public.attendance_absence_entries enable row level security;

drop policy if exists "attendance_absence_entries_select_authenticated" on public.attendance_absence_entries;
drop policy if exists "attendance_absence_entries_insert_authenticated" on public.attendance_absence_entries;
drop policy if exists "attendance_absence_entries_update_authenticated" on public.attendance_absence_entries;

create policy "attendance_absence_entries_select_authenticated"
on public.attendance_absence_entries
for select
to authenticated
using (true);

create policy "attendance_absence_entries_insert_authenticated"
on public.attendance_absence_entries
for insert
to authenticated
with check (true);

create policy "attendance_absence_entries_update_authenticated"
on public.attendance_absence_entries
for update
to authenticated
using (true)
with check (true);
