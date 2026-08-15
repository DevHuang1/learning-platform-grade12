# Transformer-assisted answer processing

## Product behavior

Students can submit a text answer, a PDF, or an image for a short-answer question. The submission is stored immediately and the student can continue the exam without waiting for model inference. Each answer is then queued for server-side processing. The teacher Results screen receives the processing state through Supabase Realtime and shows the extracted answer text, suggested marks, suggested feedback, confidence, and any processing error. The transformer never finalizes a grade; the teacher enters or adjusts the final marks and then uses **Save Grades**.

No email, Slack, push, or other external notifications are sent by this feature.

## Models and services

The default model is `Qwen/Qwen2.5-VL-3B-Instruct` through Hugging Face Inference Providers. It accepts text prompts and image inputs through the OpenAI-compatible chat-completion endpoint and returns a structured teacher-review suggestion. The code intentionally does not use `microsoft/trocr-base-handwritten` as the serverless default because that checkpoint is not currently deployed by an Inference Provider. A dedicated Hugging Face Inference Endpoint or self-hosted worker can be introduced later if higher-quality handwriting OCR is required.

Text-based PDFs are parsed with `pdf-parse`, a pure TypeScript PDF parser. If a PDF has no extractable text, the processor attempts to render up to five pages as images and submits those pages to the vision-language model. If rendering or OCR cannot produce usable evidence, the review is marked as failed or low-confidence and the teacher is asked to inspect the original file manually.

## Required server configuration

Copy the following values into the deployment environment or local `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` and `HUGGINGFACE_API_TOKEN` must remain server-only and must never use the `NEXT_PUBLIC_` prefix.

```env
SUPABASE_SERVICE_ROLE_KEY=...
HUGGINGFACE_API_TOKEN=...
HUGGINGFACE_REVIEW_MODEL=Qwen/Qwen2.5-VL-3B-Instruct
HUGGINGFACE_INFERENCE_URL=https://router.huggingface.co/v1/chat/completions
```

The Hugging Face token needs permission to use Inference Providers. The Supabase service-role key is used only inside the Node.js route to download answer files and update processing records. It is never sent to the browser.

## Database setup

Apply `web/supabase/schema.sql` to the Supabase project. The migration adds file metadata to `exam_answers`, creates the teacher-only `exam_answer_reviews` table, enables row-level security for review rows, and adds the review table to the `supabase_realtime` publication when that publication is available.

The processing lifecycle is represented by `exam_answer_reviews.processing_status`:

| State | Meaning |
|---|---|
| `queued` | The answer was stored and is waiting to be processed. |
| `processing` | A server-side worker is downloading the file or calling Hugging Face. |
| `ready_for_review` | A suggestion was produced with usable confidence. |
| `needs_review` | A suggestion was produced but confidence is below the conservative threshold. |
| `failed` | Processing failed; a teacher can retry from the Results screen. |
| `reviewed` | Reserved for a future explicit AI-suggestion review audit event; final marks remain teacher-controlled. |

## Request flow

1. The student uploads a PDF or image to the `exam-answers` bucket and inserts an answer row with file metadata and no awarded marks.
2. The browser calls `POST /api/exam/process-answer` with the answer ID. The route verifies the signed-in student owns the answer through the normal Supabase session client.
3. The route creates or updates a review row, marks the submission as `processing`, and schedules the processor after returning a `202` response.
4. The server-only processor downloads the file with the service-role client, extracts PDF text when possible, and calls Hugging Face with the question prompt, answer guide, maximum marks, and answer evidence.
5. The processor writes the suggestion and confidence into `exam_answer_reviews`. Supabase Realtime delivers the row update to the teacher Results screen.
6. The teacher reviews the evidence, adjusts the final marks, optionally adds feedback, and saves grades through the existing grading flow.

The route is idempotent for answers already in `processing`, `ready_for_review`, `needs_review`, or `reviewed` state unless the teacher explicitly uses **Retry** after a failure.

## Operational safeguards

The processor limits answer files to 12 MB, caps scanned-PDF OCR fan-out at five pages, truncates extracted text before inference, uses a 90-second inference timeout, clamps model confidence to the range 0–1, and clamps suggested marks to the question’s maximum. Low-confidence suggestions remain visible but are never automatically awarded.

The existing `exam-answers` bucket is currently public for backward compatibility with the platform’s original image-answer display path. A follow-up security hardening pass should make this bucket private and replace direct public URLs with short-lived signed URLs before the platform handles sensitive student records in production.

## References

[1]: https://huggingface.co/docs/inference-providers/tasks/chat-completion Hugging Face Chat Completion API documentation.

[2]: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct Qwen2.5-VL-3B-Instruct model page.

[3]: https://github.com/mehmet-kozan/pdf-parse pdf-parse repository and runtime documentation.

[4]: https://huggingface.co/microsoft/trocr-base-handwritten Microsoft TrOCR handwritten model card and provider availability.
