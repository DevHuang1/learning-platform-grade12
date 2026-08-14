"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase";

const INPUT_CLASSES =
  "w-full border border-stone-300 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm";

function Brand() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center bg-ink font-serif text-xl font-extrabold text-paper">
        G12
      </div>
      <h1 className="mt-5 font-serif text-2xl font-bold tracking-tight text-stone-900">
        Create your account
      </h1>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-stone-500">
        Join the G12 Learning Platform
      </p>
    </div>
  );
}

function SetupNotice() {
  return (
    <Card className="w-full max-w-md">
      <h2 className="font-serif text-lg font-semibold text-stone-900">
        Supabase is not configured
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Supabase is not configured. Copy{" "}
        <code className="bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-stone-800">
          web/.env.local.example
        </code>{" "}
        to{" "}
        <code className="bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-stone-800">
          web/.env.local
        </code>{" "}
        and add your Supabase URL and anon key.
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-stone-600">
        <li>Create a Supabase project at supabase.com</li>
        <li>Copy web/.env.local.example to web/.env.local</li>
        <li>Add your project URL and anon key from Settings → API</li>
        <li>Restart the development server</li>
      </ol>
    </Card>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin border-2 border-white border-t-transparent"
    />
  );
}

async function emailConfirmationRequired(): Promise<boolean> {
  try {
    const client = createClient();
    const { data } = await client.auth.getSession();
    return !data.session;
  } catch {
    return false;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, configured } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  const TEACHER_INVITE_CODE =
    process.env.NEXT_PUBLIC_TEACHER_INVITE_CODE || "";
  const isTeacher = role === "teacher";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const name = fullName.trim();
    if (!name) {
      setError("Please enter your full name.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (isTeacher) {
      if (!TEACHER_INVITE_CODE) {
        setError(
          "Teacher registration is not set up yet. Ask an administrator for the teacher invite code.",
        );
        return;
      }
      if (inviteCode.trim() !== TEACHER_INVITE_CODE) {
        setError("That invite code is not valid.");
        return;
      }
    }

    setPending(true);
    const res = await signUp(trimmedEmail, password, name, role);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    if (await emailConfirmationRequired()) {
      setComplete(true);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (!configured) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-ink px-4 py-12">
        <SetupNotice />
      </main>
    );
  }

  if (complete) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-ink px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center bg-emerald-100 text-2xl font-bold text-emerald-600">
            ✓
          </div>
          <h1 className="mt-5 font-serif text-xl font-bold tracking-tight text-stone-900">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-stone-900">{email}</span>. Click
            it to activate your account, then come back and sign in.
          </p>
          <div className="mt-6 grid gap-3">
            <Link href="/login" className="block">
              <Button className="w-full">Go to sign in</Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Already have an account? Sign in
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-ink px-4 py-12">
      <Card className="w-full max-w-md">
        <Brand />
        {error && (
          <div
            role="alert"
            className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700">
              I am a…
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors ${
                  role === "student"
                    ? "border-ink bg-ink text-paper"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors ${
                  role === "teacher"
                    ? "border-ink bg-ink text-paper"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                Teacher
              </button>
            </div>
            {isTeacher && (
              <p className="mt-1.5 text-xs text-stone-500">
                Teachers need an invite code provided by your administrator.
              </p>
            )}
          </div>
          {isTeacher && (
            <div>
              <label
                htmlFor="inviteCode"
                className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700"
              >
                Teacher invite code
              </label>
              <input
                id="inviteCode"
                type="text"
                required
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter the teacher invite code"
                className={INPUT_CLASSES}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700"
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className={INPUT_CLASSES}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASSES}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={INPUT_CLASSES}
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={INPUT_CLASSES}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Spinner />}
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}