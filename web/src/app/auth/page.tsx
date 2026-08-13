"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!configured) {
      router.replace("/login");
      return;
    }
    router.replace(user ? "/" : "/login");
  }, [user, loading, configured, router]);

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-br from-brand-700 via-brand-900 to-brand-950">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white shadow-lg shadow-brand-950/40">
        G12
      </div>
    </main>
  );
}