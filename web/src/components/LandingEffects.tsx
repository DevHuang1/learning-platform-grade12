"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

function useMotionOk() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOk(!mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOk(!e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return ok;
}

export function TravellingProduct() {
  const ref = useRef<HTMLDivElement>(null);
  const ok = useMotionOk();

  useEffect(() => {
    if (!ok) return;
    const el = ref.current;
    if (!el) return;

    const STOPS = [
      { p: 0, x: 14, y: 58, r: -10, s: 1, o: 1 },
      { p: 0.3, x: 72, y: 46, r: 8, s: 0.92, o: 1 },
      { p: 0.55, x: 46, y: 32, r: -3, s: 1.05, o: 1 },
      { p: 0.75, x: 42, y: 18, r: -8, s: 1.18, o: 0.25 },
      { p: 1, x: 40, y: 6, r: -12, s: 1.28, o: 0 },
    ];

    let raf = 0;
    const render = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / 2000));
      let a = STOPS[0];
      let b = STOPS[STOPS.length - 1];
      for (let i = 0; i < STOPS.length - 1; i++) {
        if (p >= STOPS[i].p && p <= STOPS[i + 1].p) {
          a = STOPS[i];
          b = STOPS[i + 1];
          break;
        }
      }
      const t = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const r = a.r + (b.r - a.r) * t;
      const s = a.s + (b.s - a.s) * t;
      const o = a.o + (b.o - a.o) * t;
      el.style.transform = `translate(calc(${x}vw - 50%), calc(${y}vh - 50%)) rotate(${r}deg) scale(${s})`;
      el.style.opacity = String(o);
      el.style.visibility = o <= 0 ? "hidden" : "visible";
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ok]);

  if (!ok) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-10 text-ink"
      style={{
        opacity: 0,
        visibility: "hidden",
        filter: "drop-shadow(0 14px 28px rgba(20, 28, 43, 0.22))",
      }}
    >
      <svg
        viewBox="0 0 96 96"
        className="h-24 w-24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M48 26 C36 14 18 14 10 18 L10 70 C22 62 36 64 48 74 C60 64 74 62 86 70 L86 18 C78 14 60 14 48 26 Z" />
        <path d="M48 26 L48 74" />
        <path d="M20 34 C28 28 38 30 46 36" />
        <path d="M20 46 C28 40 38 42 46 48" />
        <path d="M76 34 C68 28 58 30 50 36" />
        <path d="M76 46 C68 40 58 42 50 48" />
      </svg>
    </div>
  );
}

const BOOK =
  "M 200 66 C 166 44 92 40 48 54 L 48 170 C 100 152 170 154 200 180 C 230 154 300 152 352 170 L 352 54 C 308 40 234 44 200 66 Z";
const SPINE = "M 200 66 L 200 180";
const PAGES =
  "M 64 80 C 108 70 162 72 196 84 M 64 108 C 108 98 162 100 196 112 M 64 136 C 108 126 162 128 196 140 M 336 80 C 292 70 238 72 204 84 M 336 108 C 292 98 238 100 204 112 M 336 136 C 292 126 238 128 204 140";
const FLOURISH =
  "M 60 205 C 140 192 260 192 340 205 M 330 205 C 338 196 350 192 358 200";
const STAR = "M 320 28 l 5 7 7 5 -7 5 -5 7 -5 -7 -7 -5 7 -5 5 -7 z";

const VARIANTS = [
  {
    key: "blank",
    label: "Blank",
    width: 1.5,
    d: `${BOOK} ${SPINE}`,
    facts: ["MODE: BLANK", "CLUE: SENTENCE", "AIM: 1 WORD"],
  },
  {
    key: "meaning",
    label: "Meaning",
    width: 2.25,
    d: `${BOOK} ${SPINE} ${PAGES}`,
    facts: ["MODE: MEANING", "CLUE: DEFINITION", "AIM: 1 WORD"],
  },
  {
    key: "advanced",
    label: "Advanced",
    width: 3,
    d: `${BOOK} ${SPINE} ${PAGES} ${FLOURISH} ${STAR}`,
    facts: ["MODE: ADVANCED", "CLUE: HARDER SENTENCE", "AIM: STREAK"],
  },
];

export function SelfDrawingDemo() {
  const [variant, setVariant] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const ok = useMotionOk();
  const current = VARIANTS[variant];

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.transition = "none";
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = String(len);
    void path.getBoundingClientRect();
    if (!ok) {
      path.style.strokeDashoffset = "0";
      return;
    }
    path.style.transition = "stroke-dashoffset 2s ease-in-out";
    path.style.strokeDashoffset = "0";
  }, [variant, ok]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v, i) => (
          <Button
            key={v.key}
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={i === variant}
            onClick={() => setVariant(i)}
            className={i === variant ? "bg-ink text-paper" : ""}
          >
            {v.label}
          </Button>
        ))}
      </div>
      <div className="mt-6 border border-stone-200 bg-white p-6">
        <svg
          viewBox="0 0 400 240"
          className="mx-auto block h-auto w-full max-w-xl text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth={current.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path ref={pathRef} d={current.d} />
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {current.facts.map((f) => (
          <span key={f} className="label text-muted">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SpreadWordmark({
  spreadOnScroll = true,
}: {
  spreadOnScroll?: boolean;
}) {
  const gRef = useRef<HTMLSpanElement>(null);
  const twoRef = useRef<HTMLSpanElement>(null);
  const ok = useMotionOk();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (ok) {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
    setRevealed(true);
  }, [ok]);

  useEffect(() => {
    if (!ok || !spreadOnScroll) return;
    let raf = 0;
    const render = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / 700));
      const spread = p * 0.42;
      const sink = p * 0.2;
      if (gRef.current) {
        gRef.current.style.transform = `translateX(-${spread}em) translateY(${sink}em)`;
      }
      if (twoRef.current) {
        twoRef.current.style.transform = `translateX(${spread}em) translateY(${sink}em)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ok, spreadOnScroll]);

  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div style={{ transform: "translateY(0.18em)" }}>
        <div
          className={cn(
            "flex items-baseline justify-between font-serif text-[18vw] leading-none tracking-[-0.02em]",
            ok && !revealed ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
            ok && "transition-[transform,opacity] duration-[1200ms] ease-out",
          )}
          style={{ width: "103%" }}
        >
          <span ref={gRef} className="text-ink">
            G
          </span>
          <span className="text-ink">1</span>
          <span ref={twoRef} className="text-ink">
            2
          </span>
        </div>
      </div>
    </div>
  );
}
