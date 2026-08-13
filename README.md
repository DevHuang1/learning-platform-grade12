# G12 Learning Platform

Migrated from a single-file quiz app (`index.html`) into an enterprise-style
Next.js + Supabase learning platform with full authentication and a SaaS
dashboard. Student-friendly UI with four sections: **Dashboard**, **Quiz**,
**Exam**, **Result** and **Schedule**.

## Features

- **Enterprise dashboard** (`/`) — role-aware home with student learning
  analytics: KPI stats (words answered, accuracy, streak, today's activity),
  14-day accuracy chart, mode breakdown, unit mastery bars, upcoming exams and
  recent results (recharts). Teachers get a management overview (submissions,
  pending grading, scheduled/published exams).
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
  meaning clue, normal / advanced difficulty, all 12 units, streak). Works
  fully offline from bundled JSON. Signed-in users get cloud history sync.
- **Exam** — fully customizable exam sheets. A sheet is made of sections, and
  each question carries its own marks value (1 mark, 5 marks, 10 marks, any
  number). Students take exams one question at a time and upload a **photo of
  their written answer**, stored in the Supabase `exam-answers` storage bucket.
  Sheet builder + list are teacher-only.
- **Result** — students see their own submissions and awarded marks; teachers
  see all students and can grade (award marks + feedback per answer).
- **Schedule** — exam schedule announcements. Students see upcoming/past exams;
  teachers manage (add/edit/deactivate/delete) schedules.

## Project layout

```
web/
  src/app/          # app router pages (/, /login, /register, /quiz, /exam/…, /result, /schedule)
  src/components/   # Shell+sidebar layout, AuthProvider, Card/Button/Badge/StatBox UI kit
  src/lib/          # supabase clients, db access layer, storage uploads, analytics, vocab helpers, types
  src/proxy.ts      # route guard middleware (Next 16)
  src/data/         # vocab + sentences JSON extracted from the original index.html
  supabase/
    schema.sql      # tables + RLS policies (auth-aware, roles)
    seed.js         # pushes vocab data & creates buckets (needs .env.local)
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
   policies.
3. `cd web && node supabase/seed.js` to load the 12 units, 585 words and
   585 normal + 585 advanced sentences, and create the `exam-answers` and
   `question-images` storage buckets.
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

## Re-extracting vocab data

If `index.html` changes, regenerate the JSON with:

```bash
node extract.js   # from the repo root
```

## Commands

```bash
cd web
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
```