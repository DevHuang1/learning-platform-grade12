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
  image_path text,           -- legacy image path inside the bucket
  image_url text,            -- legacy public URL for display
  file_path text,            -- PDF or image path inside the bucket
  file_url text,             -- PDF or image URL for display
  file_name text,
  file_mime_type text,
  file_size bigint,
  marks_awarded numeric(6,1),
  feedback text,
  created_at timestamptz not null default now()
);

-- Migrations for databases created before PDF/file answers were introduced.
alter table exam_answers add column if not exists file_path text;
alter table exam_answers add column if not exists file_url text;
alter table exam_answers add column if not exists file_name text;
alter table exam_answers add column if not exists file_mime_type text;
alter table exam_answers add column if not exists file_size bigint;

create index if not exists idx_exam_submissions_user_id on exam_submissions(user_id);
create index if not exists idx_exam_answers_submission_id on exam_answers(submission_id);

-- Existing answer URLs were generated for the old public bucket. The bucket is
-- private now, so readers must use the signed/authorized file route instead.
update exam_answers set image_url = null where image_path is not null;
update exam_answers set file_url = null where file_path is not null;

-- Teacher-only transformer output. Students never receive model suggestions.
create table if not exists exam_answer_reviews (
  id bigserial primary key,
  answer_id bigint not null unique references exam_answers(id) on delete cascade,
  processing_status text not null default 'queued', -- queued | processing | ready_for_review | needs_review | failed | reviewed
  extracted_text text,
  suggested_marks numeric(6,1),
  suggested_feedback text,
  model_confidence numeric(4,3),
  model_name text,
  processing_error text,
  attempt_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
alter table exam_answer_reviews enable row level security;

-- Realtime sends teacher-only review updates to the results page.
alter table exam_answer_reviews replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'exam_answer_reviews'
    ) then
    alter publication supabase_realtime add table public.exam_answer_reviews;
  end if;
end
$$;

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
create policy "submissions select own" on exam_submissions for select to authenticated using (auth.uid() = user_id or public.is_teacher());
drop policy if exists "submissions insert own" on exam_submissions;
create policy "submissions insert own" on exam_submissions for insert to authenticated with check (
  auth.uid() = user_id
  and status = 'submitted'
  and coalesce(obtained_marks, 0) = 0
  and graded_by is null
);
drop policy if exists "submissions teacher update" on exam_submissions;
create policy "submissions teacher update" on exam_submissions for update to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Answers: students see their own; teachers see all.
drop policy if exists "answers select own" on exam_answers;
create policy "answers select own" on exam_answers for select to authenticated using (
  public.is_teacher()
  or exists (
    select 1 from exam_submissions s
    where s.id = exam_answers.submission_id and s.user_id = auth.uid()
  )
);
drop policy if exists "answers insert own" on exam_answers;
create policy "answers insert own" on exam_answers for insert to authenticated with check (
  exists (
    select 1 from exam_submissions s
    where s.id = exam_answers.submission_id and s.user_id = auth.uid()
  )
  and marks_awarded is null
  and feedback is null
  and image_url is null
  and file_url is null
  and (
    image_path is null
    or image_path like 'submission-' || submission_id::text || '/%'
  )
  and (
    file_path is null
    or file_path like 'submission-' || submission_id::text || '/%'
  )
);
drop policy if exists "answers teacher update" on exam_answers;
create policy "answers teacher update" on exam_answers for update to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Transformer results are visible only to teachers.
drop policy if exists "answer reviews teacher select" on exam_answer_reviews;
create policy "answer reviews teacher select" on exam_answer_reviews for select to authenticated using (public.is_teacher());
drop policy if exists "answer reviews teacher update" on exam_answer_reviews;
create policy "answer reviews teacher update" on exam_answer_reviews for update to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- ============================================================
-- Storage buckets & policies
-- Browser (anon key) cannot create buckets — that is admin-only.
-- Create them here so images work immediately after schema is applied.
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('question-images', 'question-images', true),
  ('exam-answers', 'exam-answers', false)
on conflict (id) do update set public = excluded.public;

-- Question illustrations are intentionally public; student answer files are not.
drop policy if exists "read question-images" on storage.objects;
create policy "read question-images" on storage.objects
  for select to public using (bucket_id = 'question-images');

drop policy if exists "read exam-answers" on storage.objects;
drop policy if exists "answer owner or teacher read" on storage.objects;
create policy "answer owner or teacher read" on storage.objects
  for select to authenticated using (
    bucket_id = 'exam-answers'
    and (
      public.is_teacher()
      or exists (
        select 1
        from public.exam_submissions s
        where s.id = nullif(substring(name from '^submission-([0-9]+)/'), '')::bigint
          and s.user_id = auth.uid()
      )
    )
  );

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

-- Students can upload only into their own submission folder.
drop policy if exists "student insert exam-answers" on storage.objects;
drop policy if exists "student insert own exam-answers" on storage.objects;
create policy "student insert own exam-answers" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'exam-answers'
    and exists (
      select 1
      from public.exam_submissions s
      where s.id = nullif(substring(name from '^submission-([0-9]+)/'), '')::bigint
        and s.user_id = auth.uid()
    )
  );


-- ============================================================
-- Optional demo English exams
-- ============================================================
-- This block creates two published Grade 12 English exams only when the
-- matching titles do not already exist. It intentionally does not create an
-- auth.users row: create the demo student in Supabase Auth, then run
-- `npm run demo:seed` from web/ to upload the PDF/PNG answer fixtures and
-- create queued demo submissions.
--
-- Suggested demo account:
--   email: demo.student+g12@example.com
--   password: choose a temporary password in Supabase Auth
--   role: student
-- ============================================================
do $$
declare
  reading_sheet_id bigint;
  reading_section_id bigint;
  writing_sheet_id bigint;
  writing_section_id bigint;
begin
  if not exists (
    select 1 from exam_sheets
    where title = 'Demo English Exam 1 — Reading and Language'
  ) then
    insert into exam_sheets (title, subject, description, duration_minutes, status)
    values (
      'Demo English Exam 1 — Reading and Language',
      'English',
      'A short Grade 12 English review exam covering reading, grammar, and evidence-based writing.',
      35,
      'published'
    ) returning id into reading_sheet_id;

    insert into exam_sheet_sections (sheet_id, position, title, instructions)
    values (
      reading_sheet_id,
      1,
      'Reading comprehension',
      'Answer in complete sentences and support each response with evidence from the passage.'
    ) returning id into reading_section_id;

    insert into exam_questions (
      section_id, position, prompt, answer_guide, marks, question_type, options, correct_option
    ) values
    (
      reading_section_id,
      1,
      'In two or three sentences, explain the central idea of a passage about community libraries and identify one detail that supports it.',
      'The answer should explain that community libraries provide shared access to knowledge and opportunity, with a relevant supporting detail such as free resources, study space, or digital access.',
      5,
      'short_answer',
      '[]'::jsonb,
      0
    ),
    (
      reading_section_id,
      2,
      'Read the attached answer sheet and explain how the writer uses a transition to connect two ideas.',
      'The answer should identify a transition such as however, therefore, or in addition and explain the relationship it creates between the surrounding ideas.',
      5,
      'short_answer',
      '[]'::jsonb,
      0
    ),
    (
      reading_section_id,
      3,
      'Study the attached handwritten-style response and identify one grammatical strength and one improvement opportunity.',
      'The answer should identify a real strength such as clear subject-verb agreement or precise vocabulary and a reasonable improvement such as punctuation, sentence variety, or word choice.',
      5,
      'short_answer',
      '[]'::jsonb,
      0
    );
  end if;

  if not exists (
    select 1 from exam_sheets
    where title = 'Demo English Exam 2 — Writing and Critical Thinking'
  ) then
    insert into exam_sheets (title, subject, description, duration_minutes, status)
    values (
      'Demo English Exam 2 — Writing and Critical Thinking',
      'English',
      'A second Grade 12 English practice exam focused on argument, tone, and editing.',
      40,
      'published'
    ) returning id into writing_sheet_id;

    insert into exam_sheet_sections (sheet_id, position, title, instructions)
    values (
      writing_sheet_id,
      1,
      'Writing and editing',
      'Write clearly, refer to the question, and explain your reasoning.'
    ) returning id into writing_section_id;

    insert into exam_questions (
      section_id, position, prompt, answer_guide, marks, question_type, options, correct_option
    ) values
    (
      writing_section_id,
      1,
      'Write a short argument for or against requiring students to complete a community-service project before graduation.',
      'A strong response takes a clear position, gives at least two relevant reasons, and explains how the evidence supports the claim.',
      8,
      'short_answer',
      '[]'::jsonb,
      0
    ),
    (
      writing_section_id,
      2,
      'Inspect the attached editing response and explain how the writer''s tone affects the reader.',
      'The response should identify whether the tone is formal, urgent, optimistic, critical, or another defensible description and connect that tone to specific language choices.',
      6,
      'short_answer',
      '[]'::jsonb,
      0
    ),
    (
      writing_section_id,
      3,
      'Read the attached revision sheet and propose one change that would make the conclusion more persuasive.',
      'The answer should propose a specific revision such as restating the claim, adding a consequence, responding to a counterargument, or ending with a clear call to action.',
      6,
      'short_answer',
      '[]'::jsonb,
      0
    );
  end if;
end
$$;
