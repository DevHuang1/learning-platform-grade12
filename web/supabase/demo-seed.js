/**
 * Seeds two English exams and a demo student submission for the transformer flow.
 *
 * Run from web/ after applying schema.sql:
 *   node supabase/demo-seed.js
 *
 * Required server-only environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   DEMO_STUDENT_EMAIL=demo.student+g12@example.com
 *   DEMO_STUDENT_PASSWORD=temporary-password
 *   DEMO_RESET=false
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Configure web/.env.local first.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const demoEmail = process.env.DEMO_STUDENT_EMAIL || "demo.student+g12@example.com";
const demoPassword =
  process.env.DEMO_STUDENT_PASSWORD ||
  `Demo-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}!`;
const shouldReset = process.env.DEMO_RESET !== "false";
const assetsDir = path.join(__dirname, "demo-assets");

const exams = [
  {
    title: "Demo English Exam 1 — Reading and Language",
    description: "A short Grade 12 English review exam covering reading, grammar, and evidence-based writing.",
    duration_minutes: 35,
    sections: [
      {
        title: "Reading comprehension",
        instructions: "Answer in complete sentences and support each response with evidence from the passage.",
        questions: [
          {
            prompt: "In two or three sentences, explain the central idea of a passage about community libraries and identify one detail that supports it.",
            answer_guide: "The answer should explain that community libraries provide shared access to knowledge and opportunity, with a relevant supporting detail such as free resources, study space, or digital access.",
            marks: 5,
            answer: { text: "The central idea is that community libraries make learning resources available to everyone. Free books, quiet study space, and internet access support that idea." },
          },
          {
            prompt: "Read the attached answer sheet and explain how the writer uses a transition to connect two ideas.",
            answer_guide: "The answer should identify a transition such as however, therefore, or in addition and explain the relationship it creates between the surrounding ideas.",
            marks: 5,
            answer: { file: "demo-answer-transition.pdf", mime: "application/pdf" },
          },
          {
            prompt: "Study the attached handwritten-style response and identify one grammatical strength and one improvement opportunity.",
            answer_guide: "The answer should identify a real strength such as clear subject-verb agreement or precise vocabulary and a reasonable improvement such as punctuation, sentence variety, or word choice.",
            marks: 5,
            answer: { file: "demo-answer-grammar.png", mime: "image/png" },
          },
        ],
      },
    ],
  },
  {
    title: "Demo English Exam 2 — Writing and Critical Thinking",
    description: "A second Grade 12 English practice exam focused on argument, tone, and editing.",
    duration_minutes: 40,
    sections: [
      {
        title: "Writing and editing",
        instructions: "Write clearly, refer to the question, and explain your reasoning.",
        questions: [
          {
            prompt: "Write a short argument for or against requiring students to complete a community-service project before graduation.",
            answer_guide: "A strong response takes a clear position, gives at least two relevant reasons, and explains how the evidence supports the claim.",
            marks: 8,
            answer: { text: "Schools should require a community-service project because it connects classroom learning to local needs and helps students develop responsibility. The requirement should offer several project choices so students can contribute in different ways." },
          },
          {
            prompt: "Inspect the attached editing response and explain how the writer’s tone affects the reader.",
            answer_guide: "The response should identify whether the tone is formal, urgent, optimistic, critical, or another defensible description and connect that tone to specific language choices.",
            marks: 6,
            answer: { file: "demo-answer-tone.png", mime: "image/png" },
          },
          {
            prompt: "Read the attached revision sheet and propose one change that would make the conclusion more persuasive.",
            answer_guide: "The answer should propose a specific revision such as restating the claim, adding a consequence, responding to a counterargument, or ending with a clear call to action.",
            marks: 6,
            answer: { file: "demo-answer-revision.pdf", mime: "application/pdf" },
          },
        ],
      },
    ],
  },
];

async function ensurePrivateAnswerBucket() {
  const { data: bucket } = await admin.storage.getBucket("exam-answers");
  if (!bucket) {
    const { error } = await admin.storage.createBucket("exam-answers", { public: false });
    if (error) throw error;
  } else if (bucket.public) {
    const { error } = await admin.storage.updateBucket("exam-answers", { public: false });
    if (error) throw error;
  }
}

async function getOrCreateStudent() {
  const { data: users, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  let user = users.users.find((candidate) => candidate.email?.toLowerCase() === demoEmail.toLowerCase());
  if (!user) {
    const result = await admin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: "Demo English Student", role: "student" },
    });
    if (result.error) throw result.error;
    user = result.data.user;
  } else if (process.env.DEMO_STUDENT_PASSWORD) {
    const result = await admin.auth.admin.updateUserById(user.id, {
      password: process.env.DEMO_STUDENT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo English Student", role: "student" },
    });
    if (result.error) throw result.error;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: demoEmail,
      full_name: "Demo English Student",
      role: "student",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  return user;
}

async function seedExam(definition) {
  const { data: existing } = await admin
    .from("exam_sheets")
    .select("id")
    .eq("title", definition.title);
  if (shouldReset && existing?.length) {
    const { error } = await admin
      .from("exam_sheets")
      .delete()
      .in("id", existing.map((sheet) => sheet.id));
    if (error) throw error;
  }

  const { data: sheet, error: sheetError } = await admin
    .from("exam_sheets")
    .insert({
      title: definition.title,
      subject: "English",
      description: definition.description,
      duration_minutes: definition.duration_minutes,
      status: "published",
    })
    .select()
    .single();
  if (sheetError) throw sheetError;

  const questionRows = [];
  for (let sectionIndex = 0; sectionIndex < definition.sections.length; sectionIndex += 1) {
    const sectionDef = definition.sections[sectionIndex];
    const { data: section, error: sectionError } = await admin
      .from("exam_sheet_sections")
      .insert({
        sheet_id: sheet.id,
        position: sectionIndex + 1,
        title: sectionDef.title,
        instructions: sectionDef.instructions,
      })
      .select()
      .single();
    if (sectionError) throw sectionError;

    for (let questionIndex = 0; questionIndex < sectionDef.questions.length; questionIndex += 1) {
      const questionDef = sectionDef.questions[questionIndex];
      const { data: question, error: questionError } = await admin
        .from("exam_questions")
        .insert({
          section_id: section.id,
          position: questionIndex + 1,
          prompt: questionDef.prompt,
          answer_guide: questionDef.answer_guide,
          marks: questionDef.marks,
          question_type: "short_answer",
          options: [],
          correct_option: 0,
        })
        .select()
        .single();
      if (questionError) throw questionError;
      questionRows.push({ question, answer: questionDef.answer });
    }
  }
  return { sheet, questionRows };
}

async function uploadDemoAnswer(userId, submissionId, answer, index) {
  if (!answer.file) return null;
  const filePath = path.join(assetsDir, answer.file);
  const bytes = await fs.readFile(filePath);
  const storagePath = `submission-${submissionId}/demo-${index}-${answer.file}`;
  const { error } = await admin.storage.from("exam-answers").upload(storagePath, bytes, {
    contentType: answer.mime,
    cacheControl: "0",
    upsert: true,
  });
  if (error) throw error;
  return {
    file_path: storagePath,
    file_name: answer.file,
    file_mime_type: answer.mime,
    file_size: bytes.byteLength,
  };
}

async function seedSubmission(user, seededExam) {
  const { data: submission, error: submissionError } = await admin
    .from("exam_submissions")
    .insert({
      sheet_id: seededExam.sheet.id,
      user_id: user.id,
      student_name: "Demo English Student",
      status: "submitted",
      obtained_marks: 0,
    })
    .select()
    .single();
  if (submissionError) throw submissionError;

  for (let index = 0; index < seededExam.questionRows.length; index += 1) {
    const { question, answer } = seededExam.questionRows[index];
    const file = await uploadDemoAnswer(user.id, submission.id, answer, index + 1);
    const { data: answerRow, error: answerError } = await admin
      .from("exam_answers")
      .insert({
        submission_id: submission.id,
        question_id: question.id,
        text_answer: answer.text || null,
        marks_awarded: null,
        ...(file || {}),
      })
      .select()
      .single();
    if (answerError) throw answerError;

    const { error: reviewError } = await admin.from("exam_answer_reviews").insert({
      answer_id: answerRow.id,
      processing_status: "queued",
      attempt_count: 0,
    });
    if (reviewError) throw reviewError;
  }
  return submission;
}

async function main() {
  await ensurePrivateAnswerBucket();
  const user = await getOrCreateStudent();
  const seededExams = [];
  for (const definition of exams) seededExams.push(await seedExam(definition));
  const submissions = [];
  for (const seededExam of seededExams) {
    submissions.push(await seedSubmission(user, seededExam));
  }

  console.log("Demo seed complete.");
  console.log(JSON.stringify({
    student: {
      email: demoEmail,
      password: demoPassword,
      note: process.env.DEMO_STUDENT_PASSWORD
        ? "Password came from DEMO_STUDENT_PASSWORD."
        : "Password was generated for this run; save it now if you need to sign in.",
    },
    exams: seededExams.map(({ sheet }) => ({ id: sheet.id, title: sheet.title, status: sheet.status })),
    submissions: submissions.map((submission) => ({ id: submission.id, sheet_id: submission.sheet_id, status: submission.status })),
    nextStep: "Sign in as the demo student, open each published exam, and watch the teacher Results page for processing updates after configuring HUGGINGFACE_API_TOKEN.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
