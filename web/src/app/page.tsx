"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  SelfDrawingDemo,
  SpreadWordmark,
  TravellingProduct,
} from "@/components/LandingEffects";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
  { href: "#material", label: "Materials" },
  { href: "#specs", label: "Specs" },
];

const HERO_SPECS = [
  { label: "12 units", value: "12 UNITS" },
  { label: "585 words", value: "585 WORDS" },
  { label: "585 sentences", value: "585 SENTENCES" },
];

const ARGUMENT_ROWS = [
  {
    label: "FORGIVE",
    text: "No penalties, instant feedback",
    value: "0 pressure",
  },
  {
    label: "ADAPTIVE",
    text: "Normal & advanced difficulty",
    value: "2 modes",
  },
  {
    label: "CURATED",
    text: "12 themed units",
    value: "585 words",
  },
];

const MATERIAL_ROWS = [
  {
    label: "WORDS",
    text: "585 vocabulary words across 12 units",
    value: "585",
  },
  {
    label: "SENTENCES",
    text: "585 normal + 585 advanced sentence clues",
    value: "1,170",
  },
  {
    label: "MODES",
    text: "Fill-in-the-blank & meaning clue",
    value: "2",
  },
  {
    label: "TRACKING",
    text: "Streaks, history, and per-unit mastery",
    value: "ongoing",
  },
];

const MEASUREMENT_ROWS = [
  { label: "UNITS", text: "Themed vocabulary sets", value: "12" },
  { label: "WORDS", text: "Total vocabulary", value: "585" },
  { label: "NORMAL SENTENCES", text: "Standard clues", value: "585" },
  { label: "ADVANCED SENTENCES", text: "Harder clues", value: "585" },
  { label: "MODES", text: "Question styles", value: "2" },
  { label: "DIFFICULTIES", text: "Normal & advanced", value: "2" },
];

export default function LandingPage() {
  const [heroIn, setHeroIn] = useState(false);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotion(!mq.matches);
    const id = requestAnimationFrame(() => setHeroIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const heroCopy = cn(
    motion && !heroIn ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0",
    motion && "transition-all duration-1000 ease-out",
  );

  return (
    <main>
      <TravellingProduct />

      <header className="fixed inset-x-0 top-0 z-20 flex h-[58px] items-center justify-between border-b border-stone-200 bg-paper/80 px-6 backdrop-blur">
        <a href="#top" className="font-serif text-xl tracking-[-0.02em] text-ink">
          G12<span className="text-brand-600">.</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="label text-ink-2 transition-colors hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link href="/login">
          <Button size="sm">Open app</Button>
        </Link>
      </header>

      <section
        id="top"
        className="flex min-h-[calc(100vh-58px)] flex-col overflow-hidden bg-paper-2 pt-[58px]"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
          <div className={cn("max-w-[46vw] py-16", heroCopy)}>
            <p className="label text-brand-600">
              G12 ENGLISH VOCABULARY · GRADE 12
            </p>
            <h1 className="mt-6 font-serif text-[clamp(32px,4.6vw,68px)] leading-[1.05] tracking-[-0.02em] text-ink">
              The G12 vocabulary <em className="italic text-brand-600">practice</em> you actually finish.
            </h1>
            <p className="mt-6 max-w-xl font-mono text-sm leading-[1.9] tracking-[0.07em] text-ink-2">
              A focused vocabulary quiz for grade twelve — twelve themed units,
              585 words, and a sentence clue for every one. Normal or advanced,
              fill-in-the-blank or meaning. No penalty for trying.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg">Start practicing</Button>
              </Link>
              <a href="#demo">
                <Button variant="secondary" size="lg">
                  See the demo
                </Button>
              </a>
            </div>
          </div>

          <div className="hairline mt-auto border-t py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {HERO_SPECS.map((s) => (
                <span key={s.value} className="label text-muted">
                  {s.value}
                </span>
              ))}
            </div>
          </div>
        </div>

        <SpreadWordmark />
      </section>

      <section
        id="features"
        className="scroll-mt-[58px] border-b border-stone-200"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl leading-tight tracking-[-0.02em] text-ink">
              Built to keep you practicing, not to punish you.
            </h2>
            <p className="mt-6 max-w-md font-mono text-sm leading-[1.9] tracking-[0.07em] text-ink-2">
              Every question answers itself the moment you type. Your streak
              stays if you show up; the difficulty meets you where you are.
            </p>
          </div>
          <div className="hairline border-t">
            {ARGUMENT_ROWS.map((row) => (
              <div
                key={row.label}
                className="hairline flex items-start justify-between gap-6 border-b py-5"
              >
                <div>
                  <p className="label text-brand-600">{row.label}</p>
                  <p className="mt-1 font-mono text-sm tracking-[0.05em] text-ink-2">
                    {row.text}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm text-ink">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="demo"
        className="scroll-mt-[58px] border-b border-stone-200 bg-paper-2"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="label text-brand-600">DEMONSTRATION</p>
          <h2 className="mt-4 font-serif text-4xl tracking-[-0.02em] text-ink">
            Watch it <em className="italic text-brand-600">draw itself</em>.
          </h2>
          <div className="mt-10">
            <SelfDrawingDemo />
          </div>
        </div>
      </section>

      <section
        id="material"
        className="scroll-mt-[58px] border-b border-stone-200"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl leading-tight tracking-[-0.02em] text-ink">
              What it is made of.
            </h2>
            <p className="mt-6 max-w-md font-mono text-sm leading-[1.9] tracking-[0.07em] text-ink-2">
              A vocabulary bank built for one classroom, one year, and every
              word you will be asked.
            </p>
          </div>
          <div className="hairline border-t">
            {MATERIAL_ROWS.map((row) => (
              <div
                key={row.label}
                className="hairline flex items-start justify-between gap-6 border-b py-5"
              >
                <div>
                  <p className="label text-brand-600">{row.label}</p>
                  <p className="mt-1 font-mono text-sm tracking-[0.05em] text-ink-2">
                    {row.text}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm text-ink">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="specs" className="scroll-mt-[58px] border-b border-stone-200">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="label text-brand-600">MEASUREMENTS</p>
          <h2 className="mt-4 font-serif text-4xl tracking-[-0.02em] text-ink">
            The numbers, on paper.
          </h2>
          <div className="hairline mt-10 border-t">
            {MEASUREMENT_ROWS.map((row) => (
              <div
                key={row.label}
                className="hairline flex flex-wrap items-baseline justify-between gap-4 border-b py-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
                  <p className="label w-48 shrink-0 text-brand-600">{row.label}</p>
                  <p className="font-mono text-sm tracking-[0.05em] text-ink-2">
                    {row.text}
                  </p>
                </div>
                <p className="font-serif text-2xl tabular-nums text-ink">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper-2">
        <div className="mx-auto w-full max-w-6xl px-6 pb-10 pt-24">
          <h2 className="font-serif text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.02em] text-ink">
            Five minutes a day keeps <em className="italic text-brand-600">585 words</em> in your head.
          </h2>
          <p className="mt-6 font-mono text-xs tracking-[0.09em] text-muted">
            G12 ENGLISH VOCABULARY · GRADE 12 · MADE FOR ONE CLASSROOM
          </p>
          <div className="mt-10 flex flex-wrap justify-end gap-3">
            <Link href="/login">
              <Button size="lg">Start practicing</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                View schedule
              </Button>
            </Link>
          </div>
          <div className="hairline mt-16 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="label text-muted">© 2026 G12</span>
              <span className="label text-muted">STATIONERY EDITION</span>
            </div>
          </div>
        </div>
        <SpreadWordmark spreadOnScroll={false} />
      </section>
    </main>
  );
}
