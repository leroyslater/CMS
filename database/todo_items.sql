create table if not exists public.todo_items (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  student_name text,
  task_text text not null,
  is_done boolean not null default false,
  due_date date,
  created_at timestamp with time zone not null default now()
);

alter table public.todo_items
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.todo_items
add column if not exists student_name text;

alter table public.todo_items enable row level security;

drop policy if exists "todo_items_select_authenticated" on public.todo_items;
drop policy if exists "todo_items_insert_authenticated" on public.todo_items;
drop policy if exists "todo_items_update_authenticated" on public.todo_items;
drop policy if exists "todo_items_delete_authenticated" on public.todo_items;

create policy "todo_items_select_authenticated"
on public.todo_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "todo_items_insert_authenticated"
on public.todo_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "todo_items_update_authenticated"
on public.todo_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "todo_items_delete_authenticated"
on public.todo_items
for delete
to authenticated
using (auth.uid() = user_id);
