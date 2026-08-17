// Editorial Study Hall: this shared mock state gives every route the same student snapshot until real data services are connected.
export type Subject = { id: string; name: string; unit: string; progress: number; tone: "teal" | "clay" | "ink"; nextAction: string };
export type Resource = { id: string; title: string; type: string; pages: number; subject: string };
export type StudySession = { id: string; label: string; detail: string; minutes: number; complete: boolean };

export const mockSubjects: Subject[] = [
  { id: "math", name: "Mathematics", unit: "Functions & graphs", progress: 72, tone: "teal", nextAction: "Practice transformations" },
  { id: "physics", name: "Physics", unit: "Electric fields", progress: 48, tone: "clay", nextAction: "Resume worked examples" },
  { id: "english", name: "English Literature", unit: "Close reading", progress: 86, tone: "ink", nextAction: "Review annotations" },
];

export const mockResources: Resource[] = [
  { id: "electric-notes", title: "Electric fields — lesson notes", type: "Lesson notes", pages: 2, subject: "Physics" },
  { id: "functions-set", title: "Functions & graphs — practice set", type: "Practice set", pages: 3, subject: "Mathematics" },
  { id: "close-reading", title: "Close reading — reference sheet", type: "Reference sheet", pages: 4, subject: "English Literature" },
];

export const mockSessions: StudySession[] = [
  { id: "mon-math", label: "Mon · Mathematics", detail: "Practice completed", minutes: 25, complete: true },
  { id: "tue-physics", label: "Tue · Physics", detail: "Practice completed", minutes: 35, complete: true },
  { id: "thu-english", label: "Thu · English Literature", detail: "Practice completed", minutes: 45, complete: true },
  { id: "sat-review", label: "Sat · Review", detail: "Reflection logged", minutes: 35, complete: true },
  { id: "sun-plan", label: "Sun · Open study block", detail: "Planned session", minutes: 45, complete: false },
];

export const mockPlan = { title: "Study block", schedule: "Tuesday · 16:30–17:15", description: "Review the worked examples before your practice set." };

export type ExamQuestion = { id: number; prompt: string; options: string[]; answer: number; hint: string; explanation: string };
export const mockExam = {
  id: "physics-electric-fields",
  title: "Electric Fields · Practice Exam",
  subject: "Physics",
  durationMinutes: 12,
  questions: [
    { id: 1, prompt: "Which statement best describes an electric field?", options: ["A region where a charge experiences force", "A path followed by an electron", "A material that stores current", "A measure of resistance"], answer: 0, hint: "Think about what would happen to a small positive test charge placed in the region.", explanation: "An electric field describes the force that would act on a positive test charge in that region." },
    { id: 2, prompt: "If the distance from a point charge doubles, the field strength becomes…", options: ["Twice as large", "Half as large", "One quarter as large", "Unchanged"], answer: 2, hint: "The distance appears squared in the denominator of the relationship.", explanation: "For a point charge, field strength follows an inverse-square relationship with distance." },
    { id: 3, prompt: "Electric field lines around an isolated positive charge point…", options: ["Inward", "Outward", "In circles", "Randomly"], answer: 1, hint: "Imagine the direction a positive test charge would be pushed.", explanation: "Field lines point away from positive charges and toward negative charges." },
    { id: 4, prompt: "What is the SI unit for electric field strength?", options: ["Joule", "Newton per coulomb", "Coulomb per second", "Watt"], answer: 1, hint: "Electric field is force divided by charge.", explanation: "Electric field strength is measured in newtons per coulomb (N/C)." },
  ] satisfies ExamQuestion[],
};
