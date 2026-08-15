import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractPdfAnswer,
  processAnswerWithHuggingFace,
} from "../src/lib/answer-processing";

const reviewJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    extracted_text: "The submitted answer explains the main idea.",
    suggested_marks: 4,
    suggested_feedback: "The answer is relevant and includes supporting reasoning.",
    confidence: 0.82,
    ...overrides,
  });

function mockInference(content: string, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Hugging Face answer processing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends question context and returns a bounded teacher-review suggestion", async () => {
    vi.stubEnv("HUGGINGFACE_API_TOKEN", "test-token");
    const fetchMock = mockInference(reviewJson({ suggested_marks: 99, confidence: 1.4 }));

    const result = await processAnswerWithHuggingFace({
      questionPrompt: "Explain the central idea.",
      answerGuide: "Mention shared access to learning resources.",
      marks: 5,
      textAnswer: "Libraries make learning resources available to everyone.",
      fileBytes: null,
      fileMimeType: null,
      fileName: null,
    });

    expect(result).toEqual({
      extracted_text: "The submitted answer explains the main idea.",
      suggested_marks: 5,
      suggested_feedback: "The answer is relevant and includes supporting reasoning.",
      confidence: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(payload.model).toBe("Qwen/Qwen2.5-VL-3B-Instruct");
    expect(payload.messages[0].role).toBe("system");
    expect(payload.messages[1].content).toContain("Explain the central idea.");
    expect(payload.messages[1].content).toContain("Libraries make learning resources available");
    expect(payload.headers).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });

  it("retries without JSON schema when a provider rejects response_format", async () => {
    vi.stubEnv("HUGGINGFACE_API_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unsupported response_format", { status: 400 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: reviewJson() } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await processAnswerWithHuggingFace({
      questionPrompt: "Describe the tone.",
      answerGuide: "Use evidence from the language.",
      marks: 6,
      textAnswer: "The tone is urgent because the writer uses must.",
      fileBytes: null,
      fileMimeType: null,
      fileName: null,
    });

    expect(result.suggested_marks).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstPayload.response_format.type).toBe("json_schema");
    expect(secondPayload.response_format).toBeUndefined();
  });

  it("includes an image data URL for image answers", async () => {
    vi.stubEnv("HUGGINGFACE_API_TOKEN", "test-token");
    const fetchMock = mockInference(reviewJson());
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

    await processAnswerWithHuggingFace({
      questionPrompt: "Identify one grammatical strength.",
      answerGuide: "Mention agreement, punctuation, or precise vocabulary.",
      marks: 5,
      textAnswer: null,
      fileBytes: bytes,
      fileMimeType: "image/png",
      fileName: "grammar.png",
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const content = payload.messages[1].content;
    expect(content).toHaveLength(2);
    expect(content[1].type).toBe("image_url");
    expect(content[1].image_url.url).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("extracts text from the committed demo PDF fixture", async () => {
    const pdfPath = resolve(process.cwd(), "supabase/demo-assets/demo-answer-transition.pdf");
    const pdfBytes = new Uint8Array(await readFile(pdfPath));
    const result = await extractPdfAnswer(pdfBytes);

    expect(result.text).toContain("transition");
    expect(result.pageImages).toHaveLength(0);
  });

  it("fails clearly when Hugging Face returns an empty completion", async () => {
    vi.stubEnv("HUGGINGFACE_API_TOKEN", "test-token");
    mockInference("");

    await expect(
      processAnswerWithHuggingFace({
        questionPrompt: "Explain the answer.",
        answerGuide: "Use evidence.",
        marks: 5,
        textAnswer: "A response.",
        fileBytes: null,
        fileMimeType: null,
        fileName: null,
      }),
    ).rejects.toThrow("empty review response");
  });
});
