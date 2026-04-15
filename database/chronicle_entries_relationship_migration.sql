alter table public.chronicle_entries
rename column display_code to student_code;

alter table public.chronicle_entries
drop column if exists student_name,
drop column if exists year_level,
drop column if exists form_group;

alter table public.chronicle_entries
drop constraint if exists chronicle_entries_student_code_fkey;

alter table public.chronicle_entries
add constraint chronicle_entries_student_code_fkey
foreign key (student_code) references public.students(student_code);
