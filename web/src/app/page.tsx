"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#work", label: "Work" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#contact", label: "Contact" },
];

const PROJECTS = [
  {
    title: "Adaptive Vocabulary Engine",
    category: "LEARNING SYSTEM",
    bg: "#e0e7ff",
    orb: "rgba(99, 102, 241, 0.4)",
  },
  {
    title: "Sentence Clue Database",
    category: "CONTENT ARCHITECTURE",
    bg: "#ede9fe",
    orb: "rgba(168, 85, 247, 0.35)",
  },
  {
    title: "Streak & Mastery Tracker",
    category: "PROGRESS ANALYTICS",
    bg: "#e0e7ff",
    orb: "rgba(99, 102, 241, 0.4)",
  },
  {
    title: "Exam Simulation Suite",
    category: "ASSESSMENT TOOL",
    bg: "#ede9fe",
    orb: "rgba(168, 85, 247, 0.35)",
  },
];

const CAPABILITIES = [
  {
    title: "Adaptive Difficulty",
    tags: ["Dynamic Components", "Progressive Clues", "Two Modes"],
    body: "Every question adapts to the learner. Normal and advanced sentence clues keep the challenge alive without ever punishing a wrong answer.",
  },
  {
    title: "Curated Vocabulary",
    tags: ["12 Units", "585 Words", "585 Sentences"],
    body: "A hand-built bank of 585 words across twelve themed units, each paired with a sentence clue designed for one classroom, one year.",
  },
  {
    title: "Progress Intelligence",
    tags: ["Streaks", "History", "Per-Unit Mastery"],
    body: "Track streaks, review history, and watch per-unit mastery grow. The system remembers where you left off and meets you there.",
  },
  {
    title: "Instant Feedback",
    tags: ["Zero Penalty", "Immediate Response", "Forgiving Loop"],
    body: "Answers resolve the moment you type. No penalties, no pressure — just a continuous, forgiving loop that keeps you practicing.",
  },
];

const FOOTER_LINKS = [
  { label: "LOCATION", value: "Yangon, Myanmar" },
  { label: "CONTACT", value: "hello@g12.study" },
  { label: "SOCIAL", value: "GitHub · X · LinkedIn" },
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

function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div
        className="mesh-blob left-[-10%] top-[-20%] h-[60vh] w-[60vw]"
        style={{ background: "rgba(99, 102, 241, 0.5)" }}
      />
      <div
        className="mesh-blob right-[-15%] top-[10%] h-[55vh] w-[50vw]"
        style={{
          background: "rgba(168, 85, 247, 0.4)",
          animationDelay: "-10s",
        }}
      />
      <div
        className="mesh-blob bottom-[-25%] left-[20%] h-[50vh] w-[45vw]"
        style={{
          background: "rgba(99, 102, 241, 0.35)",
          animationDelay: "-20s",
        }}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between px-6 mix-blend-difference text-white md:px-10">
      <a href="#top" className="font-serif text-2xl italic tracking-tight">
        G12<span className="text-indigo-300">.</span>
      </a>
      <nav className="hidden items-center gap-10 md:flex">
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="group relative font-mono text-[11px] uppercase tracking-[0.3em] text-white/80 transition-colors hover:text-white"
          >
            {l.label}
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
          </a>
        ))}
      </nav>
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/90 transition-colors hover:bg-white/10"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        System Online
      </Link>
    </header>
  );
}

function Hero() {
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col overflow-hidden bg-cream"
    >
      <MeshBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-[30vh] pt-28 md:px-10">
        <div
          className={cn(
            "max-w-5xl transition-all duration-1000 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            heroIn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
          )}
        >
          <p className="label text-indigo-700">
            G12 ENGLISH VOCABULARY · GRADE 12
          </p>
          <h1 className="mt-8 max-w-5xl text-balance font-serif text-[clamp(2.75rem,8vw,7rem)] leading-[0.9] tracking-[-0.02em] text-ink">
            The G12 vocabulary{" "}
            <em className="italic text-indigo-700">practice</em> you actually
            finish.
          </h1>
          <p className="mt-8 max-w-xl font-mono text-sm leading-[1.9] tracking-[0.07em] text-ink-2">
            A focused vocabulary quiz for grade twelve — twelve themed units,
            585 words, and a sentence clue for every one. Normal or advanced,
            fill-in-the-blank or meaning. No penalty for trying.
          </p>
        </div>
      </div>

      <div className="wave-container z-20">
        <div className="wave-curve" />
      </div>

      <div className="absolute bottom-[12vh] left-1/2 z-30 -translate-x-1/2">
        <Link href="/login">
          <Button
            size="lg"
            className="btn-pulse rounded-full bg-indigo-700 px-8 font-mono text-[11px] uppercase tracking-[0.3em] text-white hover:bg-indigo-800"
          >
            Initialize
          </Button>
        </Link>
      </div>
    </section>
  );
}

function WorkGrid() {
  return (
    <section id="work" className="scroll-mt-20 bg-cream">
      <div className="mx-auto w-full max-w-7xl px-6 py-28 md:px-10">
        <Reveal>
          <p className="label text-indigo-700">SELECTED WORK</p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.05] tracking-[-0.02em] text-ink md:text-6xl">
            Built for <em className="italic text-indigo-700">one classroom</em>.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-2">
          {PROJECTS.map((p, i) => (
            <Reveal
              key={p.title}
              delay={i % 2 === 0 ? 0 : 150}
              className={cn(i % 2 === 1 && "md:mt-24")}
            >
              <a
                href="/login"
                className="group block overflow-hidden rounded-2xl transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-4 hover:scale-[1.02]"
              >
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl"
                  style={{ background: p.bg }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                    style={{ background: p.orb }}
                  />
                  <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="rounded-full bg-white px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink shadow-[0_0_20px_rgba(67,56,202,0.1)]">
                      View
                    </span>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-2xl text-ink">{p.title}</h3>
                    <p className="label shrink-0 text-muted">{p.category}</p>
                  </div>
                  <div className="line-draw mt-4 h-px w-full bg-neutral-200" />
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="capabilities"
      className="scroll-mt-20 border-t border-neutral-200 bg-cream"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-16 px-6 py-28 md:px-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <p className="label text-indigo-700">SERVICES</p>
            <h2 className="mt-4 font-serif text-5xl leading-[1.05] tracking-[-0.02em] text-ink md:text-6xl">
              Core <em className="italic text-indigo-700">capabilities</em>.
            </h2>
            <a
              href="/login"
              className="group mt-10 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:text-indigo-700"
            >
              Start practicing
              <span className="inline-block transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
                →
              </span>
            </a>
          </Reveal>
        </div>

        <div className="border-t border-neutral-200">
          {CAPABILITIES.map((c, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={c.title} delay={i * 80}>
                <div className="border-b border-neutral-200">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-baseline justify-between gap-6 py-8 text-left"
                  >
                    <span
                      className={cn(
                        "font-serif text-3xl transition-colors duration-500 md:text-4xl",
                        isOpen ? "text-ink" : "text-neutral-400 hover:text-ink",
                      )}
                    >
                      {c.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm text-muted transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                        isOpen && "rotate-45",
                      )}
                    >
                      +
                    </span>
                  </button>
                  <div className={cn("accordion-panel", isOpen && "open")}>
                    <div>
                      <p className="max-w-md pb-8 font-mono text-sm leading-[1.9] tracking-[0.05em] text-ink-2">
                        {c.body}
                      </p>
                      <div className="flex flex-wrap gap-3 pb-8">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[11px] uppercase tracking-[0.3em] text-indigo-700"
                          >
                            [{t}]
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden rounded-t-[5rem] bg-ink text-cream"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[40vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: "rgba(67, 56, 202, 0.25)" }}
      />
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-10 pt-28 md:px-10">
        <Reveal>
          <h2 className="max-w-4xl font-serif text-[clamp(32px,5vw,72px)] leading-[1.05] tracking-[-0.02em]">
            Five minutes a day keeps{" "}
            <em className="italic text-indigo-300">585 words</em> in your head.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-10 border-t border-white/10 pt-12 md:grid-cols-3">
          {FOOTER_LINKS.map((f) => (
            <div key={f.label}>
              <p className="label text-white/40">{f.label}</p>
              <p className="mt-3 font-serif text-xl text-cream/90">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            © 2026 G12
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            ORGANIC INTELLIGENCE EDITION
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-cream">
      <Header />
      <Hero />
      <WorkGrid />
      <Capabilities />
      <Footer />
    </main>
  );
}
