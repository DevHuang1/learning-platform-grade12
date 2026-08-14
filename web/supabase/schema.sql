-- G12 Learning Platform — Supabase schema
-- Run this in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- ============================================================
-- Vocabulary (seeded from the existing quiz data)
-- ============================================================
create table if not exists vocab_units (
  id bigserial primary key,
  unit_number int not null unique,
  title text not null
);

create table if not exists vocab_words (
  id bigserial primary key,
  unit_number int not null references vocab_units(unit_number),
  n int not null,
  word text not null,
  meaning text not null
);

create table if not exists vocab_sentences (
  id bigserial primary key,
  unit_number int not null,
  n int not null,
  sentence text not null,
  advanced text not null
);

-- Unique constraints so re-seeding can upsert without duplicates.
-- Added via DO block because plain Postgres lacks ADD CONSTRAINT IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vocab_words_unit_number_n_key'
      and conrelid = 'vocab_words'::regclass
  ) then
    alter table vocab_words add constraint vocab_words_unit_number_n_key unique (unit_number, n);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'vocab_sentences_unit_number_n_key'
      and conrelid = 'vocab_sentences'::regclass
  ) then
    alter table vocab_sentences add constraint vocab_sentences_unit_number_n_key unique (unit_number, n);
  end if;
end $$;

create index if not exists idx_vocab_words_unit on vocab_words(unit_number);
create index if not exists idx_vocab_sentences_unit on vocab_sentences(unit_number);

-- ============================================================
-- Users & profiles (Supabase Auth) — role: student | teacher
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','teacher')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
-- Role comes from signup metadata: 'teacher' (invite code verified by the app)
-- or defaults to 'student'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    case
      when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher'
      else 'student'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Daily quiz history (per user)
-- ============================================================
create table if not exists quiz_history (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  student_name text not null default 'Guest',
  unit_number int,
  word text not null,
  meaning text,
  guess text,
  ok boolean not null,
  mode text not null,
  difficulty text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Exam schedules (announcements)
-- ============================================================
create table if not exists exam_schedules (
  id bigserial primary key,
  title text not null,
  subject text not null,
  announcement text not null default '',
  exam_date date not null,
  start_time time,
  end_time time,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Exam sheets (fully customizable: sections + per-question marks)
-- ============================================================
create table if not exists exam_sheets (
  id bigserial primary key,
  title text not null,
  subject text not null,
  description text not null default '',
  duration_minutes int not null default 60,
  status text not null default 'draft', -- draft | published | closed
  created_at timestamptz not null default now()
);

create table if not exists exam_sheet_sections (
  id bigserial primary key,
  sheet_id bigint not null references exam_sheets(id) on delete cascade,
  position int not null default 0,
  title text not null,
  instructions text not null default '',
  image_path text,               -- path inside the bucket
  image_url text                 -- public URL for display
);
alter table exam_sheet_sections add column if not exists image_path text;
alter table exam_sheet_sections add column if not exists image_url text;

create table if not exists exam_questions (
  id bigserial primary key,
  section_id bigint not null references exam_sheet_sections(id) on delete cascade,
  position int not null default 0,
  prompt text not null,
  answer_guide text not null default '',
  marks int not null default 1,  -- e.g. 1 / 5 / 10 marks
  image_path text,               -- path inside the bucket
  image_url text,                -- public URL for display
  question_type text not null default 'short_answer',  -- multiple_choice | short_answer | fill_blank | true_false
  options jsonb not null default '[]'::jsonb,          -- multiple choice options
  correct_option int not null default 0                -- index of the correct option
);

-- Migration for databases created before question images existed.
alter table exam_questions add column if not exists image_path text;
alter table exam_questions add column if not exists image_url text;
-- Migration for databases created before question types existed.
alter table exam_questions add column if not exists question_type text not null default 'short_answer';
alter table exam_questions add column if not exists options jsonb not null default '[]'::jsonb;
alter table exam_questions add column if not exists correct_option int not null default 0;

-- ============================================================
-- Submissions & image answers (images stored in a bucket)
-- ============================================================
create table if not exists exam_submissions (
  id bigserial primary key,
  sheet_id bigint not null references exam_sheets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  student_name text not null,
  status text not null default 'submitted', -- submitted | graded
  obtained_marks numeric(6,1) default 0,
  graded_by text,
  created_at timestamptz not null default now()
);

create table if not exists exam_answers (
  id bigserial primary key,
  submission_id bigint not null references exam_submissions(id) on delete cascade,
  question_id bigint not null references exam_questions(id),
  text_answer text,
  image_path text,           -- path inside the bucket
  image_url text,            -- public URL for display
  marks_awarded numeric(6,1),
  feedback text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS: auth-aware policies (student | teacher roles via profiles)
-- ============================================================
alter table profiles enable row level security;
alter table vocab_units enable row level security;
alter table vocab_words enable row level security;
alter table vocab_sentences enable row level security;
alter table quiz_history enable row level security;
alter table exam_schedules enable row level security;
alter table exam_sheets enable row level security;
alter table exam_sheet_sections enable row level security;
alter table exam_questions enable row level security;
alter table exam_submissions enable row level security;
alter table exam_answers enable row level security;

create or replace function public.is_teacher()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- Profile: a user sees themselves; teachers see everyone.
drop policy if exists "profiles select own" on profiles;
create policy "profiles select own" on profiles for select using (auth.uid() = id or public.is_teacher());
drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles for update using (auth.uid() = id);

-- Vocab seed data: readable by any authenticated user.
drop policy if exists "read vocab_units" on vocab_units;
create policy "read vocab_units" on vocab_units for select to authenticated using (true);
drop policy if exists "read vocab_words" on vocab_words;
create policy "read vocab_words" on vocab_words for select to authenticated using (true);
drop policy if exists "read vocab_sentences" on vocab_sentences;
create policy "read vocab_sentences" on vocab_sentences for select to authenticated using (true);

-- Quiz history: users manage their own rows.
drop policy if exists "quiz_history select own" on quiz_history;
create policy "quiz_history select own" on quiz_history for select using (auth.uid() = user_id);
drop policy if exists "quiz_history insert own" on quiz_history;
create policy "quiz_history insert own" on quiz_history for insert with check (auth.uid() = user_id);
drop policy if exists "quiz_history update own" on quiz_history;
create policy "quiz_history update own" on quiz_history for update using (auth.uid() = user_id);
drop policy if exists "quiz_history delete own" on quiz_history;
create policy "quiz_history delete own" on quiz_history for delete using (auth.uid() = user_id);

-- Exam schedules: everyone reads; teachers write.
drop policy if exists "read exam_schedules" on exam_schedules;
create policy "read exam_schedules" on exam_schedules for select to authenticated using (true);
drop policy if exists "write exam_schedules" on exam_schedules;
create policy "write exam_schedules" on exam_schedules for all using (public.is_teacher()) with check (public.is_teacher());

-- Exam sheets, sections, questions: everyone reads; teachers write.
drop policy if exists "read exam_sheets" on exam_sheets;
create policy "read exam_sheets" on exam_sheets for select to authenticated using (true);
drop policy if exists "write exam_sheets" on exam_sheets;
create policy "write exam_sheets" on exam_sheets for all using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "read exam_sheet_sections" on exam_sheet_sections;
create policy "read exam_sheet_sections" on exam_sheet_sections for select to authenticated using (true);
drop policy if exists "write exam_sheet_sections" on exam_sheet_sections;
create policy "write exam_sheet_sections" on exam_sheet_sections for all using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "read exam_questions" on exam_questions;
create policy "read exam_questions" on exam_questions for select to authenticated using (true);
drop policy if exists "write exam_questions" on exam_questions;
create policy "write exam_questions" on exam_questions for all using (public.is_teacher()) with check (public.is_teacher());

-- Submissions: students see their own; teachers see all.push
drop policy if exists "submissions select own" on exam_submissions;
create policy "submissions select own" on exam_submissions for select using (auth.uid() = user_id or public.is_teacher());
drop policy if exists "submissions insert own" on exam_submissions;
create policy "submissions insert own" on exam_submissions for insert with check (auth.uid() = user_id);
drop policy if exists "submissions teacher update" on exam_submissions;
create policy "submissions teacher update" on exam_submissions for update using (public.is_teacher()) with check (public.is_teacher());

-- Answers: students see their own; teachers see all.
drop policy if exists "answers select own" on exam_answers;
create policy "answers select own" on exam_answers for select using (
  public.is_teacher()
  or exists (
    select 1 from exam_submissions s
    where s.id = exam_answers.submission_id and s.user_id = auth.uid()
  )
);
drop policy if exists "answers insert own" on exam_answers;
create policy "answers insert own" on exam_answers for insert with check (
  exists (
    select 1 from exam_submissions s
    where s.id = exam_answers.submission_id and s.user_id = auth.uid()
  )
);
drop policy if exists "answers teacher update" on exam_answers;
create policy "answers teacher update" on exam_answers for update using (public.is_teacher()) with check (public.is_teacher());

-- ============================================================
-- Storage buckets & policies
-- Browser (anon key) cannot create buckets — that is admin-only.
-- Create them here so images work immediately after schema is applied.
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('question-images', 'question-images', true),
  ('exam-answers', 'exam-answers', true)
on conflict (id) do nothing;

-- Storage RLS: images readable by anyone (anon key can read public buckets)
drop policy if exists "read question-images" on storage.objects;
create policy "read question-images" on storage.objects
  for select to public using (bucket_id = 'question-images');

drop policy if exists "read exam-answers" on storage.objects;
create policy "read exam-answers" on storage.objects
  for select to public using (bucket_id = 'exam-answers');

-- Teachers manage question/section images.
drop policy if exists "teacher write question-images" on storage.objects;
create policy "teacher write question-images" on storage.objects
  for insert to authenticated with check (bucket_id = 'question-images' and public.is_teacher());
drop policy if exists "teacher update question-images" on storage.objects;
create policy "teacher update question-images" on storage.objects
  for update to authenticated using (bucket_id = 'question-images' and public.is_teacher()) with check (bucket_id = 'question-images' and public.is_teacher());
drop policy if exists "teacher delete question-images" on storage.objects;
create policy "teacher delete question-images" on storage.objects
  for delete to authenticated using (bucket_id = 'question-images' and public.is_teacher());

-- Students upload their written-answer photos to exam-answers.
drop policy if exists "student insert exam-answers" on storage.objects;
create policy "student insert exam-answers" on storage.objects
  for insert to authenticated with check (bucket_id = 'exam-answers');
