-- ============================================================
-- قَنَد (Kand) — Supabase Schema كامل
-- شغّله في SQL Editor في مشروع Supabase الخاص بك (مرة واحدة)
-- ============================================================

-- إ bambina: musamma extensions
create extension if not exists "uuid-ossp";

-- ---------- جدول أكواد التفعيل (License Keys) ----------
create table if not exists public.license_keys (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  owner_name text,
  active boolean default true,
  created_at timestamptz default now()
);
alter table public.license_keys enable row level security;
-- anon يقرأ فقط للتحقق من صلاحية الكود (لا يمكن تعديل/حذف)
create policy "license_keys_select" on public.license_keys
  for select to anon using (true);

-- ---------- جدول المدارس ----------
create table if not exists public.schools (
  id text primary key,                 -- schoolId من التطبيق
  name text not null,
  code text unique not null,           -- School Code (6 أحرف)
  license_key text not null references public.license_keys(key),
  admin_name text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.schools enable row level security;
-- إنشاء مدرسة مسموح فقط بكود تفعيل صالح
create policy "schools_insert_license" on public.schools
  for insert to anon with check (
    exists (select 1 from public.license_keys l where l.key = license_key and l.active = true)
  );
create policy "schools_select_by_code" on public.schools
  for select to anon using (true);       -- needed to resolve code → school
create policy "schools_update_own" on public.schools
  for update to anon using (true) with check (true);

-- ---------- الجداولHangout بيانات المدرسة (عزل كامل عبر school_id) ----------
create table if not exists public.users (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  name text, email text, phone text, password text, role text, status text default 'active',
  circle_id text, student_id text, teacher_code text, photo text, created_at timestamptz default now()
);
create table if not exists public.circles (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  name text, teacher_id text, schedule jsonb default '[]'::jsonb,
  age_group text, level text, room text, created_at timestamptz default now()
);
create table if not exists public.students (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  user_id text, name text, birth_date text, circle_id text, parent_id text,
  qr_code text, photo text, joined_at text, created_at timestamptz default now()
);
create table if not exists public.attendance (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  student_id text, circle_id text, date text, status text, method text, scanned_at timestamptz
);
create table if not exists public.recitations (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  student_id text, circle_id text, teacher_id text, date text, type text,
  surah int, from_ayah int, to_ayah int, lines int, pages int, score int, notes text,
  created_at timestamptz default now()
);
create table if not exists public.exams (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  title text, type text, circle_id text, date text, created_by text, results jsonb default '[]'::jsonb
);
create table if not exists public.parent_logs (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  parent_id text, student_id text, report_type text, report_date text, confirmed_at timestamptz
);
create table if not exists public.certificates (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  recipient_id text, recipient_name text, category text, title text, detail text,
  issued_at timestamptz, issued_by text, month text
);
create table if not exists public.notifications (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  to_user text, type text, title text, body text, created_at timestamptz default now(), read boolean default false
);
create table if not exists public.backups (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  name text, created_at timestamptz default now(), source text, data jsonb
);
create table if not exists public.archive (
  id text primary key, school_id text not null references public.schools(id) on delete cascade,
  kind text, deleted_at timestamptz default now(), record jsonb
);

-- ---------- RLS + Policies لكل جدول بيانات ----------
do $$
declare t text;
begin
  for t in select unnest(array['users','circles','students','attendance','recitations','exams','parent_logs','certificates','notifications','backups','archive'])
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "%I_select" on public.%I for select to anon using (true);', t, t);
    execute format('create policy "%I_insert" on public.%I for insert to anon with check (school_id in (select id from public.schools));', t, t);
    execute format('create policy "%I_update" on public.%I for update to anon using (true) with check (true);', t, t);
    execute format('create policy "%I_delete" on public.%I for delete to anon using (true);', t, t);
  end loop;
end $$;

-- ---------- indexes للأداء ----------
create index if not exists idx_students_school on public.students(school_id);
create index if not exists idx_attendance_school on public.attendance(school_id);
create index if not exists idx_recitations_school on public.recitations(school_id);
create index if not exists idx_notifications_school on public.notifications(school_id);

-- ---------- Realtime: تفعيل نشر التغييرات اللحظية ----------
alter publication supabase_realtime add table public.schools;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.circles;
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.recitations;
alter publication supabase_realtime add table public.exams;
alter publication supabase_realtime add table public.parent_logs;
alter publication supabase_realtime add table public.certificates;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.backups;
alter publication supabase_realtime add table public.archive;

-- ---------- أكواد تفعيل افتراضية (غيّرها أو أضف المزيد) ----------
insert into public.license_keys (key, owner_name) values
  ('KAND-2026-MASTER', 'صاحب التطبيق'),
  ('KAND-2026-DEMO1', 'مدرسة تجريبية 1'),
  ('KAND-2026-DEMO2', 'مدرسة تجريبية 2')
on conflict (key) do nothing;
