"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card } from "@/components/ui";

const INPUT_CLASSES =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm";

function Brand() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white shadow-lg shadow-brand-950/40">
        G12
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900">
        G12 Learning Platform
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Sign in to continue to your dashboard
      </p>
    </div>
  );
}

function SetupNotice() {
  return (
    <Card className="w-full max-w-md">
      <h2 className="text-lg font-semibold text-stone-900">
        Supabase is not configured
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Supabase is not configured. Copy{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-800">
          web/.env.local.example
        </code>{" "}
        to{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-800">
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
      className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
    />
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const next = searchParams.get("next") ?? "";
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!configured) {
    return <SetupNotice />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn(email.trim(), password);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <Brand />
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-stone-700"
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
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={INPUT_CLASSES}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              className="size-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            Remember me
          </label>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-br from-brand-700 via-brand-900 to-brand-950 px-4 py-12">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <Brand />
            <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}