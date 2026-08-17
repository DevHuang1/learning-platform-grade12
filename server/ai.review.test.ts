import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: JSON.stringify({ hint: "Check the squared distance term.", explanation: "The field follows an inverse-square relationship.", misconception: "You treated the relationship as linear." }) } }],
  })),
}));

import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("ai.reviewFeedback", () => {
  it("returns structured review feedback through the server contract", async () => {
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.reviewFeedback({ subject: "Physics", question: "How does field strength change with distance?", selectedAnswer: "It halves", correctAnswer: "It becomes one quarter", existingExplanation: "The relationship is inverse-square." });
    expect(result).toEqual({ hint: "Check the squared distance term.", explanation: "The field follows an inverse-square relationship.", misconception: "You treated the relationship as linear." });
  });

  it("surfaces provider failures for the client retry and fallback state", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("provider unavailable"));
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.reviewFeedback({ subject: "Physics", question: "How does field strength change with distance?", selectedAnswer: "It halves", correctAnswer: "It becomes one quarter", existingExplanation: "The relationship is inverse-square." })).rejects.toThrow("provider unavailable");
  });
});
