"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const NAV = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <DashIcon />, match: "/dashboard" },
    ],
  },
  {
    section: "Learning",
    items: [
      { href: "/quiz", label: "Quiz", icon: <QuizIcon />, match: "/quiz" },
      { href: "/exam", label: "Exams", icon: <ExamIcon />, match: "/exam" },
      { href: "/result", label: "Results", icon: <ResultIcon />, match: "/result" },
      { href: "/schedule", label: "Schedule", icon: <ScheduleIcon />, match: "/schedule" },
    ],
  },
];

const TEACHER_NAV = [
  {
    section: "Teacher Tools",
    items: [
      { href: "/exam/build", label: "Exam Builder", icon: <BuildIcon />, match: "/exam/build" },
      { href: "/students", label: "Students", icon: <StudentIcon />, match: "/students" },
    ],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, configured, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const isTeacher = profile?.role === "teacher";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(item: { match: string; href: string }) {
    return pathname === item.match || pathname.startsWith(item.match + "/");
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-paper-2 lg:flex">
        <SidebarContent
          displayName={displayName}
          isTeacher={isTeacher}
          isActive={isActive}
          onNavigate={() => {}}
        />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-stone-200 bg-paper-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-none text-stone-500 transition-colors hover:bg-stone-100"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent
              displayName={displayName}
              isTeacher={isTeacher}
              isActive={isActive}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-paper/80 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-none p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-bold leading-tight text-stone-900">
                {displayName}
              </p>
              <p className="label truncate text-stone-500">
                {isTeacher ? "Teacher" : "Student"} · {user?.email || "not signed in"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {configured && user && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-none bg-ink text-sm font-bold text-paper"
                >
                  {initials(displayName)}
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-none border border-stone-200 bg-white">
                      <div className="border-b border-stone-100 px-4 py-3">
                        <p className="font-serif text-sm font-semibold text-stone-900">
                          {profile?.full_name || "Student"}
                        </p>
                        <p className="label truncate text-stone-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/schedule");
                        }}
                        className="block w-full px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.08em] text-stone-700 hover:bg-stone-50"
                      >
                        Schedule
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.08em] text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  displayName,
  isTeacher,
  isActive,
  onNavigate,
}: {
  displayName: string;
  isTeacher: boolean;
  isActive: (item: { match: string; href: string }) => boolean;
  onNavigate: () => void;
}) {
  const groups = isTeacher ? [...NAV, ...TEACHER_NAV] : NAV;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-ink text-paper">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-bold text-stone-900">G12 Learning</p>
          <p className="label truncate text-stone-500">{displayName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.section}>
            <p className="mb-1.5 px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {g.section}
            </p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
className={cn(
  "flex items-center gap-3 rounded-none border-l-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
  active
    ? "border-brand-600 bg-transparent text-brand-600"
    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-stone-200 p-3">
        <p className="label px-3 py-2 text-stone-500">Study with me · G12 English</p>
      </div>
    </div>
  );
}

// Icons
function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  );
}
function ExamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 15h4" />
    </svg>
  );
}
function ResultIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
function ScheduleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function BuildIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function StudentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}