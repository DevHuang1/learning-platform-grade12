import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = resolve(process.cwd(), "supabase/schema.sql");
const answerFileRoutePath = resolve(process.cwd(), "src/app/api/exam/answer-file/route.ts");

async function readFixtures() {
  const [schema, answerFileRoute] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(answerFileRoutePath, "utf8"),
  ]);
  return { schema, answerFileRoute };
}

describe("student answer privacy policy fixtures", () => {
  it("keeps exam answers in a private storage bucket", async () => {
    const { schema } = await readFixtures();
    expect(schema).toMatch(/\('exam-answers',\s*'exam-answers',\s*false\)/);
    expect(schema).not.toMatch(/create policy "read exam-answers"/);
    expect(schema).toMatch(/create policy "answer owner or teacher read"/);
    expect(schema).toMatch(/for select to authenticated using \(/);
  });

  it("restricts answer reads to the submission owner or a teacher", async () => {
    const { schema } = await readFixtures();
    expect(schema).toMatch(/public\.is_teacher\(\)[\s\S]+?or exists \([\s\S]+?select 1[\s\S]+?from public\.exam_submissions/);
    expect(schema).toMatch(/s\.id = nullif\(substring\(name from '\^submission-\(\[0-9\]\+\)\/'\), ''\)::bigint/);
    expect(schema).toMatch(/s\.user_id = auth\.uid\(\)/);
  });

  it("prevents student clients from forging grades, feedback, URLs, or cross-submission paths", async () => {
    const { schema } = await readFixtures();
    expect(schema).toMatch(/create policy "submissions insert own" on exam_submissions for insert to authenticated/);
    expect(schema).toMatch(/status = 'submitted'/);
    expect(schema).toMatch(/coalesce\(obtained_marks, 0\) = 0/);
    expect(schema).toMatch(/graded_by is null/);
    expect(schema).toMatch(/marks_awarded is null/);
    expect(schema).toMatch(/feedback is null/);
    expect(schema).toMatch(/image_url is null/);
    expect(schema).toMatch(/file_url is null/);
    expect(schema).toMatch(/image_path like 'submission-' \|\| submission_id::text \|\| '\/%'/);
    expect(schema).toMatch(/file_path like 'submission-' \|\| submission_id::text \|\| '\/%'/);
  });

  it("keeps transformer review rows teacher-only", async () => {
    const { schema } = await readFixtures();
    expect(schema).toMatch(/alter table exam_answer_reviews enable row level security/);
    expect(schema).toMatch(/create policy "answer reviews teacher select" on exam_answer_reviews for select to authenticated using \(public\.is_teacher\(\)\)/);
    expect(schema).toMatch(/create policy "answer reviews teacher update" on exam_answer_reviews for update to authenticated/);
  });

  it("requires an authenticated owner-or-teacher check before streaming answer bytes", async () => {
    const { answerFileRoute } = await readFixtures();
    expect(answerFileRoute).toContain("client.auth.getUser()");
    expect(answerFileRoute).toContain("submission?.user_id !== user.id");
    expect(answerFileRoute).toContain("createAdminSupabase()");
    expect(answerFileRoute).toContain('"Cache-Control": "private, no-store"');
    expect(answerFileRoute).toContain('"X-Content-Type-Options": "nosniff"');
  });
});
