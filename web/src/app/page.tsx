"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#subjects", label: "Subjects" },
  { href: "#demo", label: "Demo" },
  { href: "#contact", label: "Contact" },
];

const FEATURES = [
  {
    title: "Adaptive Difficulty",
    description:
      "Normal and advanced sentence clues adapt to every learner. No penalties — just steady progress.",
    tags: ["Two Modes", "Instant Feedback", "No Penalty"],
  },
  {
    title: "Curated Vocabulary",
    description:
      "585 hand-picked words across 12 themed units, each paired with a clear sentence clue.",
    tags: ["12 Units", "585 Words", "585 Sentences"],
  },
  {
    title: "Progress Tracking",
    description:
      "Streaks, per-unit mastery, and full history so you always know where you stand.",
    tags: ["Streaks", "History", "Mastery"],
  },
  {
    title: "Flexible Practice",
    description:
      "Fill-in-the-blank or meaning-based questions. Quiz, exam, or schedule mode.",
    tags: ["Quiz", "Exams", "Schedule"],
  },
];

const DEMO_STEPS = [
  {
    n: "01",
    title: "Pick a unit",
    text: "Choose from 12 themed vocabulary units.",
  },
  {
    n: "02",
    title: "Answer the clue",
    text: "Type the word or select the right option.",
  },
  {
    n: "03",
    title: "Get instant feedback",
    text: "Know immediately if you're right.",
  },
  {
    n: "04",
    title: "Keep your streak",
    text: "Show up daily and watch your streak grow.",
  },
];

const SUBJECTS = [
  { name: "English", count: "12 units" },
  { name: "Vocabulary", count: "585 words" },
  { name: "Sentences", count: "1,170 clues" },
  { name: "Modes", count: "2 formats" },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          G12<span className="text-indigo-600">.</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link href="/login">
          <Button size="sm" className="rounded-full">
            Get started
          </Button>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-slate-50">
      <div className="mesh-bg" aria-hidden="true">
        <div
          className="mesh-blob left-[-10%] top-[-30%] h-[50vh] w-[50vw]"
          style={{ background: "rgba(99, 102, 241, 0.35)" }}
        />
        <div
          className="mesh-blob right-[-15%] top-[10%] h-[45vh] w-[40vw]"
          style={{
            background: "rgba(129, 140, 248, 0.3)",
            animationDelay: "-10s",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-32 text-center sm:px-6 md:pt-40">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          System Online
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Learning platform for G12
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
          Twelve themed units, 585 words, and a sentence clue for every one.
          Normal or advanced — practice the way you learn best.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button size="lg" className="rounded-full px-8">
              Start practicing
            </Button>
          </Link>
          <Link href="#demo">
            <Button size="lg" variant="secondary" className="rounded-full px-8">
              See how it works
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {SUBJECTS.map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm"
            >
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {s.count}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {s.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Features
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to build a strong vocabulary
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
                <h3 className="text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {f.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section id="demo" className="scroll-mt-20 bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Simple enough to start today
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-sm font-bold text-indigo-600">{s.n}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 text-center">
          <Link href="/login">
            <Button size="lg" className="rounded-full px-10">
              Try it free
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="bg-slate-900 text-slate-300">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6">
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Five minutes a day keeps 585 words in your head.
        </h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Platform
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/quiz" className="hover:text-white">
                  Quiz
                </Link>
              </li>
              <li>
                <Link href="/exam" className="hover:text-white">
                  Exams
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-white">
                  Schedule
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Results
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/result" className="hover:text-white">
                  My results
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contact
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              G12 — built for one classroom, one year, and every word you'll be
              asked.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <span className="text-sm text-slate-400">© 2026 G12</span>
          <span className="text-sm text-slate-400">Made for students</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-white">
      <Header />
      <Hero />
      <Features />
      <Demo />
      <Footer />
    </main>
  );
}
