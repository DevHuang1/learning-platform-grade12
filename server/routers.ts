import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const reviewFeedbackSchema = z.object({
  subject: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  selectedAnswer: z.string().max(240).optional(),
  correctAnswer: z.string().min(1).max(240),
  existingExplanation: z.string().min(1).max(600),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ai: router({
    reviewFeedback: publicProcedure.input(reviewFeedbackSchema).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a patient Grade 12 tutor. Return JSON only. Give a concise hint that nudges the student without revealing the answer immediately, then explain the misconception and the correct reasoning in clear student-friendly language. Do not shame the student." },
          { role: "user", content: `Subject: ${input.subject}\nQuestion: ${input.question}\nStudent answer: ${input.selectedAnswer ?? "No answer selected"}\nCorrect answer: ${input.correctAnswer}\nReference explanation: ${input.existingExplanation}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "exam_review_feedback",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hint: { type: "string" },
                explanation: { type: "string" },
                misconception: { type: "string" },
              },
              required: ["hint", "explanation", "misconception"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("AI review did not return text");
      try {
        return JSON.parse(content) as { hint: string; explanation: string; misconception: string };
      } catch {
        throw new Error("AI review returned invalid structured feedback");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
