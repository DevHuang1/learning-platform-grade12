# G12 Learning Platform

Next.js + Supabase learning platform with full authentication and a SaaS
dashboard. Student-friendly UI with four sections: **Dashboard**, **Quiz**,
**Exam**, **Result** and **Schedule**.

## Features

- **Enterprise dashboard** (`/`) — role-aware home with student learning
  analytics: KPI stats (words answered, accuracy, streak, today's activity),
  14-day accuracy chart, mode breakdown, unit mastery bars, upcoming exams and
  recent results (recharts), all filterable by subject. Teachers get a
  management overview (submissions, pending grading, scheduled/published
  exams).
- **Auth** — Supabase Auth (email/password) with sign-up/login, session
  management, route guarding via `src/proxy.ts`, and a profile-based role
  system (`student` | `teacher`).
- **Sidebar layout** — desktop sidebar + mobile drawer, topbar with user menu,
  role-based navigation ("Teacher Tools" visible only to teachers: Exam Builder
  + Students list).
- **Students list** (`/students`, teacher-only) — every enrolled student with
  per-student analytics: words answered, accuracy, streak, best exam score,
  per-unit mastery, expandable practice history, search + "Make teacher"
  promotion control.
- **Quiz** (`/quiz`) — the original G12 English vocab quiz (fill-in-the-blank /
  meaning clue, normal / advanced difficulty, all 12 units, streak). Loads
  vocabulary from the Supabase DB (`vocab_units` / `vocab_words` /
  `vocab_sentences`); the bundled JSON is kept only as an offline fallback when
  Supabase isn't configured. Signed-in users get cloud history sync.
- **Exam** — fully customizable exam sheets. A sheet is made of sections, and
  both sections and individual questions can carry their own **images**
  (stored in the `question-images` bucket). Every question has a **type** —
  multiple choice, short answer, fill in the blank, or true/false — and its
  own marks value (1 mark, 5 marks, 10 marks, any number). Exam sheets and
  schedules share a fixed subject list (**Chemistry / English / Physics /
  Maths**), and exam lists and the dashboard filter by subject. Students take
  exams one question at a time and upload a **photo of their written answer**,
  stored in the Supabase `exam-answers` storage bucket. Sheet builder + list
  are teacher-only.
- **Result** — students see their own submissions and awarded marks; teachers
  see all students and can grade (award marks + feedback per answer).
- **Schedule** — exam schedule announcements (tagged with one of the fixed
  subjects). Students see upcoming/past exams; teachers manage
  (add/edit/deactivate/delete) schedules.

## Project layout

```
web/
  src/app/          # app router pages (/, /login, /register, /quiz, /exam/…, /result, /schedule)
  src/components/   # Shell+sidebar layout, AuthProvider, Card/Button/Badge/StatBox UI kit
  src/lib/          # supabase clients, db access layer, storage uploads (incl. question/section images), analytics, constants (subjects, question types), types
  src/proxy.ts      # route guard middleware (Next 16)
  src/data/         # offline fallback / seed source: vocab + sentences JSON
  supabase/
    schema.sql      # tables + RLS policies + unique constraints/indexes (auth-aware, roles; idempotent — safe to re-run)
    seed.js         # idempotently upserts vocab data & creates buckets (needs .env.local)
```

## Getting started

```bash
cd web
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm install
npm run dev
```

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor. This creates tables, the
   `profiles` table (auto-created on sign-up via trigger), and auth-aware RLS
   policies. It also adds unique constraints on the vocab tables
   (`vocab_units(unit_number)`, `vocab_words(unit_number, n)`,
   `vocab_sentences(unit_number, n)`) plus supporting indexes so seeds can
   upsert without duplicates. Policies are idempotent (`DROP POLICY IF EXISTS`
   before each `CREATE POLICY`) and new columns use `ADD COLUMN IF NOT EXISTS`,
   so the file can be re-run safely to apply migrations.
3. `cd web && node supabase/seed.js` to load the 12 units, 585 words and
   585 normal + 585 advanced sentences, and create the `exam-answers` and
   `question-images` storage buckets. The script upserts, so it's safe to
   re-run: existing rows are updated, nothing is deleted or duplicated.
4. Open `http://localhost:3000`. On the register page choose **Student** or
   **Teacher**. Teacher registration requires the **teacher invite code** from
   `NEXT_PUBLIC_TEACHER_INVITE_CODE` (set this to a private value and share it
   with your staff). The role is stored in the `profiles.role` column via signup
   metadata and enforced by RLS + the UI (exam builder / grading / schedule
   management are teacher-only).
5. Enable email provider in Supabase Auth → Providers (email confirmation on
   is fine; register page handles both cases).

Without env vars the app still runs in offline/demo mode (quiz works; auth and
cloud features show a "Supabase not configured" notice).

## Commands

```bash
cd web
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
```