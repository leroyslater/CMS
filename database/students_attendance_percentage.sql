alter table public.students
add column if not exists attendance_percentage numeric(5,2);
