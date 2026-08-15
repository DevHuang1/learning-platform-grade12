# English exam and transformer demo

The repository now includes two published Grade 12 English exams, four answer fixtures, and a repeatable Supabase demo seeder. The seed creates or updates a confirmed student account, publishes the exams, uploads representative PDF and PNG answers into the private `exam-answers` bucket, creates submissions, and inserts queued teacher-review rows.

## Prerequisites

Apply `web/supabase/schema.sql` first. Then create `web/.env.local` with the Supabase URL and the server-only service-role key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HUGGINGFACE_API_TOKEN=your-hugging-face-token
HUGGINGFACE_REVIEW_MODEL=Qwen/Qwen2.5-VL-3B-Instruct
HUGGINGFACE_INFERENCE_URL=https://router.huggingface.co/v1/chat/completions
```

The service-role key and Hugging Face token must remain server-only. Do not commit `.env.local` or place either secret in a `NEXT_PUBLIC_` variable.

## Seed command

From the `web` directory, run:

```bash
npm run demo:seed
```

The default demo login is `demo.student+g12@example.com`. For a predictable password, set `DEMO_STUDENT_PASSWORD` before running the seed. Otherwise, the script generates a one-time password and prints it once in the terminal. Set `DEMO_RESET=false` to retain existing exams with the same titles; the default behavior replaces prior demo exams and creates fresh submissions.

```bash
DEMO_STUDENT_PASSWORD='choose-a-temporary-password' npm run demo:seed
```

The demo exams are titled **Demo English Exam 1 — Reading and Language** and **Demo English Exam 2 — Writing and Critical Thinking**. Each contains three short-answer questions. The seeded submissions include text answers, PDF answers, and image answers so all three processor input paths can be exercised.

## Verification flow

Start the web application with `npm run dev`, sign in through `/login` using the demo student credentials, and confirm that the two published exams appear at `/exam`. The seeder creates the sample submissions directly so the teacher can open `/result` and observe the processing lifecycle. When the Hugging Face token is configured, trigger processing from the student flow or use the teacher’s **Process** fallback action for an unqueued answer. The teacher Results view should receive Realtime updates, show transcription and suggestions, and keep final marks under teacher control.

Because this repository checkout does not contain a live Supabase project URL, service-role key, or Hugging Face token, the demo account and hosted rows cannot be created from the sandbox automatically. The seeder is ready to run against the configured project and prints the exact account, exam IDs, and submission IDs after a successful run.
