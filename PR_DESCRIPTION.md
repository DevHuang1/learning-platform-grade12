# Teacher-reviewed transformer answer processing

## Summary

This pull request adds a server-side answer-processing pipeline for English exam submissions. Students can submit text, PDF, or image answers, while Hugging Face produces a structured suggestion for transcription, marks, feedback, and confidence. The model output is never treated as an official grade: teachers review and adjust the final marks in the existing Results workflow.

The feature also adds two published Grade 12 English demo exams, repeatable answer fixtures, a demo seeder, private student-answer storage, owner/teacher access controls, deterministic model tests, offline policy assertions, and an opt-in live Supabase RLS test suite.

## What changed

| Area | Implementation |
|---|---|
| Answer ingestion | Short-answer submissions accept PDF and image files up to 12 MB, preserve file metadata, and leave `marks_awarded` null until teacher grading. |
| Transformer processing | `POST /api/exam/process-answer` queues and processes answers server-side with Hugging Face Inference Providers. Text PDFs use `pdf-parse`; scanned PDFs can fall back to rendered page images. |
| Structured output | The processor requests JSON-schema output when supported, retries without schema when a provider rejects that option, clamps confidence to 0–1, and clamps suggested marks to the question maximum. |
| Teacher workflow | Supabase Realtime updates the Results page with per-answer processing state, transcription, confidence, suggested feedback, suggested marks, failure messages, retry controls, and overall progress. |
| Privacy | `exam-answers` is private. Storage reads are scoped to the submission owner or a teacher. The authenticated answer-file route streams files after checking the signed-in user. Legacy public answer URLs are cleared by the schema migration. |
| RLS hardening | Student inserts cannot forge graded submissions, marks, feedback, public URLs, or cross-submission file paths. Transformer review rows are teacher-only. Ownership indexes support the new policies. |
| Demo fixtures | `schema.sql` adds two idempotent published English exams. `web/supabase/demo-seed.js` creates a demo student, uploads PDF/PNG fixtures, creates submissions, and queues review rows. |
| Test coverage | Vitest tests cover Hugging Face request behavior and response normalization, static RLS policy intent, private storage configuration, authenticated answer streaming, and an opt-in live Supabase RLS matrix. |

## Model behavior and safety

The default model is `Qwen/Qwen2.5-VL-3B-Instruct`. The service receives question context, the answer guide, maximum marks, and either normalized text or server-downloaded image evidence. The browser never receives the service-role key or direct private storage URL. Low-confidence and failed results remain visible to teachers and require manual review.

The processing states are `queued`, `processing`, `ready_for_review`, `needs_review`, `failed`, and `reviewed`. Students do not receive transformer suggestions through the database policies or the Results UI.

## Required deployment configuration

Configure these values only in the server environment or `web/.env.local` for local testing:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HUGGINGFACE_API_TOKEN=your-hugging-face-token
HUGGINGFACE_REVIEW_MODEL=Qwen/Qwen2.5-VL-3B-Instruct
HUGGINGFACE_INFERENCE_URL=https://router.huggingface.co/v1/chat/completions
```

Apply `web/supabase/schema.sql` in the Supabase SQL editor before testing. The schema includes the private bucket migration, RLS policies, Realtime publication entry, and two demo English exams. Do not commit `.env.local` or expose service-role/model credentials through `NEXT_PUBLIC_` variables.

## Automated testing

The default test suite is intentionally offline and deterministic:

```bash
cd web
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run typecheck
npm run lint
npm run build
```

The Hugging Face tests mock `fetch`, so they do not make network calls or incur inference charges. The PDF test uses the committed demo fixture. The static RLS suite reads the checked-in schema and authenticated file route to catch accidental policy or privacy regressions.

The live policy suite is opt-in and must point to a disposable Supabase test project, never production:

```bash
export SUPABASE_RLS_TEST_URL=https://your-test-project.supabase.co
export SUPABASE_RLS_TEST_ANON_KEY=...
export SUPABASE_RLS_TEST_SERVICE_ROLE_KEY=...
npm run test:live
```

The live suite creates temporary student and teacher users, a temporary exam, a private answer file, and a transformer review row. It verifies owner access, cross-student denial, teacher access, private file access, and forged-write rejection, then deletes the temporary users and records.

## Manual testing checklist

### Student submission flow

- [ ] Apply `web/supabase/schema.sql` to a disposable Supabase project.
- [ ] Create or seed a student account and confirm the account has the `student` role.
- [ ] Confirm both demo English exams appear in the published exam catalog.
- [ ] Submit a text answer and verify that the student can continue without waiting for model inference.
- [ ] Submit a PDF answer and confirm only PDF/image file types are accepted.
- [ ] Submit an image answer and confirm the file-size limit and preview behavior.
- [ ] Confirm the student sees a queue acknowledgement but never sees teacher-only model suggestions.

### Teacher review flow

- [ ] Sign in with a teacher account and open `/result`.
- [ ] Confirm processing states update in the submission list and open submission without a page refresh.
- [ ] Confirm extracted text, confidence, suggested marks, and suggested feedback appear for successful processing.
- [ ] Confirm low-confidence results display a review warning and do not automatically apply marks.
- [ ] Force or simulate a processing failure and verify the teacher can retry.
- [ ] Confirm the teacher can edit suggested marks and save final grades through the existing grading flow.
- [ ] Confirm another student cannot see the submission, answer file, or transformer review rows.

### Storage and security

- [ ] Verify `exam-answers.public` is `false` in Supabase Storage.
- [ ] Confirm an old public object URL no longer returns the answer file.
- [ ] Confirm the authenticated answer-file route permits the owner and teachers only.
- [ ] Attempt a cross-submission upload and confirm both database and storage policies reject it.
- [ ] Attempt to insert marks, feedback, or public URLs as a student and confirm the RLS check rejects it.
- [ ] Inspect browser source and network payloads to confirm the service-role key is absent.

### Regression checks

- [ ] Open dashboard, exam catalog, exam-taking, result, schedule, and quiz routes.
- [ ] Confirm question illustrations remain visible because they use the separate public `question-images` bucket.
- [ ] Confirm existing teacher exam-builder workflows still upload and render question images.
- [ ] Test keyboard navigation, mobile layouts, PDF opening, image rendering, and reduced-motion behavior.

## Known limitations and follow-ups

The application build and offline tests can pass without a live Supabase or Hugging Face configuration, but the complete upload-to-model-to-Realtime flow must be validated in a disposable hosted test project. The current server route uses authenticated streaming for private answer files; short-lived signed URLs could be introduced later if direct browser downloads are needed. Bucket-level MIME and size restrictions should also be configured in Supabase as a second line of defense.

The repository currently has three pre-existing ESLint warnings in unrelated dashboard, home, and students files. They are not introduced by this feature.

## References

[1]: https://huggingface.co/docs/inference-providers/tasks/chat-completion Hugging Face Chat Completion API documentation.

[2]: https://supabase.com/docs/guides/storage/buckets/fundamentals Supabase Storage Bucket Fundamentals.

[3]: https://supabase.com/docs/guides/storage/serving/downloads Supabase Serving Assets from Storage.

[4]: https://supabase.com/docs/guides/database/postgres/row-level-security Supabase Row Level Security documentation.


## Current validation snapshot

The latest clean-install validation produced the following results:

| Command | Result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed. |
| `npm test` | Passed: 2 files, 10 tests. |
| `npm run test:live` | Passed as an opt-in suite with 4 tests skipped because dedicated `SUPABASE_RLS_TEST_*` variables are not configured in this checkout. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed with zero errors and three existing warnings in unrelated application files. |
| `npm run build` | Passed; all application and API routes compiled successfully. |
