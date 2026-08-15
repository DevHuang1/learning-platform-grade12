import { PDFParse } from "pdf-parse";

const HF_API_URL =
  process.env.HUGGINGFACE_INFERENCE_URL ||
  "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL =
  process.env.HUGGINGFACE_REVIEW_MODEL || "Qwen/Qwen2.5-VL-3B-Instruct";
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PDF_PAGES_FOR_OCR = 5;
const MAX_CONTEXT_CHARS = 18_000;

type ReviewResult = {
  extracted_text: string;
  suggested_marks: number | null;
  suggested_feedback: string;
  confidence: number;
};

type PdfProcessingResult = {
  text: string;
  pageImages: string[];
};

function clampNumber(value: unknown, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<
      string,
      unknown
    >;
  }
  return JSON.parse(candidate) as Record<string, unknown>;
}

function toDataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType || "application/octet-stream"};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function callHuggingFace(
  prompt: string,
  imageDataUrl?: string,
): Promise<ReviewResult> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Hugging Face is not configured. Add HUGGINGFACE_API_TOKEN on the server.",
    );
  }

  const userContent = imageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : prompt;

  const basePayload = {
    model: HF_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an education assessment assistant. Analyze the submitted answer against the question and answer guide. You are only producing a suggestion for a qualified teacher; never claim that the answer has been officially graded. Be conservative when the evidence is unclear. Return valid JSON only.",
      },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    max_tokens: 700,
  };

  const schemaPayload = {
    ...basePayload,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "answer_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            extracted_text: { type: "string" },
            suggested_marks: { type: ["number", "null"] },
            suggested_feedback: { type: "string" },
            confidence: { type: "number" },
          },
          required: [
            "extracted_text",
            "suggested_marks",
            "suggested_feedback",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
    },
  };

  const request = async (payload: typeof basePayload | typeof schemaPayload) =>
    fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    });

  let response = await request(schemaPayload);
  if (!response.ok && response.status === 400) {
    // Some providers do not implement JSON-schema output even though the
    // shared endpoint advertises it. Retry once with the same strict prompt.
    response = await request(basePayload);
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Hugging Face inference failed (${response.status}): ${message.slice(0, 500)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Hugging Face returned an empty review response.");

  const parsed = parseJsonContent(content);
  const suggestedMarks = parsed.suggested_marks;
  return {
    extracted_text: String(parsed.extracted_text || "").trim(),
    suggested_marks:
      suggestedMarks === null || suggestedMarks === undefined
        ? null
        : clampNumber(suggestedMarks, 0, 100),
    suggested_feedback: String(parsed.suggested_feedback || "").trim(),
    confidence: clampNumber(parsed.confidence, 0, 1),
  };
}

export async function extractPdfAnswer(bytes: Uint8Array): Promise<PdfProcessingResult> {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("PDF answer is larger than the 12 MB processing limit.");
  }

  const parser = new PDFParse({ data: bytes });
  try {
    const textResult = await parser.getText();
    const text = String(textResult.text || "").trim().slice(0, MAX_CONTEXT_CHARS);
    if (text.length >= 20) return { text, pageImages: [] };

    try {
      const screenshots = await parser.getScreenshot({
        first: MAX_PDF_PAGES_FOR_OCR,
        desiredWidth: 1400,
      });
      const pageImages = screenshots.pages
        .map((page: { data?: Uint8Array | ArrayBuffer; imageDataUrl?: string }) => {
          if (page.imageDataUrl) return page.imageDataUrl;
          if (!page.data) return "";
          return toDataUrl(new Uint8Array(page.data), "image/png");
        })
        .filter(Boolean);
      return { text, pageImages };
    } catch {
      return { text, pageImages: [] };
    }
  } finally {
    await parser.destroy();
  }
}

export async function processAnswerWithHuggingFace(input: {
  questionPrompt: string;
  answerGuide: string;
  marks: number;
  textAnswer: string | null;
  fileBytes: Uint8Array | null;
  fileMimeType: string | null;
  fileName: string | null;
}) {
  const context = [
    `Question: ${input.questionPrompt}`,
    `Answer guide: ${input.answerGuide}`,
    `Maximum marks: ${input.marks}`,
    input.textAnswer ? `Submitted text answer: ${input.textAnswer}` : "",
    input.fileName ? `Submitted file name: ${input.fileName}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS);

  if (input.fileBytes && input.fileMimeType === "application/pdf") {
    const pdf = await extractPdfAnswer(input.fileBytes);
    if (pdf.text.length >= 20) {
      const review = await callHuggingFace(
        `${context}\n\nExtracted PDF answer text:\n${pdf.text}\n\nReturn a teacher-review suggestion.`,
      );
      return {
        ...review,
        suggested_marks:
          review.suggested_marks === null
            ? null
            : Math.min(input.marks, review.suggested_marks),
      };
    }

    if (pdf.pageImages.length > 0) {
      const pageReviews: ReviewResult[] = [];
      for (const pageImage of pdf.pageImages) {
        pageReviews.push(
          await callHuggingFace(
            `${context}\n\nThis is one page of a scanned PDF answer. Transcribe the visible answer and provide a conservative teacher-review suggestion.`,
            pageImage,
          ),
        );
      }
      const extractedText = pageReviews
        .map((review, index) => `Page ${index + 1}: ${review.extracted_text}`)
        .join("\n")
        .trim();
      const confidence =
        pageReviews.reduce((sum, review) => sum + review.confidence, 0) /
        pageReviews.length;
      const suggestedMarks = pageReviews.reduce(
        (sum, review) => sum + (review.suggested_marks || 0),
        0,
      );
      return {
        extracted_text: extractedText,
        suggested_marks: Math.min(input.marks, suggestedMarks),
        suggested_feedback:
          pageReviews.map((review) => review.suggested_feedback).filter(Boolean).join(" ") ||
          "Review the scanned PDF pages manually.",
        confidence,
      };
    }

    return {
      extracted_text: "No extractable PDF text was found.",
      suggested_marks: null,
      suggested_feedback:
        "This PDF could not be read automatically. Please review the original file manually.",
      confidence: 0,
    } satisfies ReviewResult;
  }

  const imageDataUrl = input.fileBytes
    ? toDataUrl(input.fileBytes, input.fileMimeType || "image/jpeg")
    : undefined;
  const review = await callHuggingFace(
    `${context}\n\n${imageDataUrl ? "Read the submitted answer image, transcribe it, and provide a conservative teacher-review suggestion." : "Evaluate the submitted text answer and provide a conservative teacher-review suggestion."}`,
    imageDataUrl,
  );
  return {
    ...review,
    suggested_marks:
      review.suggested_marks === null
        ? null
        : Math.min(input.marks, review.suggested_marks),
  };
}

export function answerProcessorModelName() {
  return HF_MODEL;
}
