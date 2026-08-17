import { describe, expect, it, vi } from "vitest";

const save = vi.fn();
vi.mock("jspdf", () => ({
  jsPDF: class {
    setTextColor() {} setFont() {} setFontSize() {} text() {} setFillColor() {} roundedRect() {} setDrawColor() {} line() {} splitTextToSize(value: string) { return [value]; }
    save = save;
  },
}));

import { exportPerformanceReport } from "../client/src/lib/reportExport";

describe("exportPerformanceReport", () => {
  it("creates and saves a performance report from persisted exam data", () => {
    exportPerformanceReport({
      examTitle: "Electric Fields · Practice Exam",
      history: [{ id: "a1", examId: "physics", title: "Practice", score: 3, total: 4, percentage: 75, answers: { 1: 0 }, completedAt: "2026-08-17T00:00:00.000Z", durationSeconds: 320, questionDurations: { 1: 80 } }],
      questionAnalytics: [{ id: 1, prompt: "How does field strength change with distance?", averageSeconds: 80, misses: 1 }],
    });
    expect(save).toHaveBeenCalledWith("study-hall-performance-report.pdf");
  });
});
