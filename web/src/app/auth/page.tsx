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
    <main className="flex min-h-dvh w-full items-center justify-center bg-ink">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center bg-paper font-serif text-xl font-extrabold text-ink">
        G12
      </div>
    </main>
  );
}