// Editorial Study Hall: the persistent shell owns theme controls, search, and study-plan actions so all routes behave consistently.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookOpen, CheckCircle2, LayoutDashboard, Library, Menu, Moon, Search, Sparkles, Sun, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { mockPlan, mockResources, mockSubjects } from "./lib/mockData";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

const navItems = [{ href: "/", label: "Overview", icon: LayoutDashboard }, { href: "/subjects", label: "Subjects", icon: BookOpen }, { href: "/progress", label: "Progress", icon: CheckCircle2 }, { href: "/resources", label: "Resources", icon: Library }];

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [...mockSubjects.map((item) => ({ title: item.name, detail: item.unit, href: "/subjects" })), ...mockResources.map((item) => ({ title: item.title, detail: item.type, href: "/resources" }))];
    return [...mockSubjects.map((item) => ({ title: item.name, detail: item.unit, href: "/subjects" })), ...mockResources.map((item) => ({ title: item.title, detail: item.type, href: "/resources" }))].filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(term));
  }, [query]);
  const goTo = (href: string) => { setLocation(href); onClose(); };
  return <div className="search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="search-panel" role="dialog" aria-modal="true" aria-label="Search study hall"><div className="search-heading"><p className="eyebrow text-primary">Find your next step</p><button className="icon-button" onClick={onClose} aria-label="Close search"><X size={18} /></button></div><div className="search-input-wrap"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects, notes, or practice sets…" /></div><div className="search-results">{results.length ? results.map((result) => <button className="search-result" key={`${result.href}-${result.title}`} onClick={() => goTo(result.href)}><div className="resource-icon"><BookOpen size={16} /></div><div><strong>{result.title}</strong><span>{result.detail}</span></div></button>) : <p className="empty-search">No study material matches “{query}”.</p>}</div><p className="search-hint">Search stays shared across the platform. Press the close button to return to your current page.</p></section></div>;
}

function PlatformShell() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [planAdded, setPlanAdded] = useState(false);
  const goToPlan = () => { setPlanAdded(true); };
  return <div className="platform-shell min-h-screen bg-background text-foreground">
    <aside className="platform-rail"><div className="rail-brand"><div className="brand-mark" aria-hidden="true"><span /><span /></div><div><p className="eyebrow">Grade 12</p><p className="brand-name">Study Hall</p></div></div><div className="rail-section"><p className="rail-label">Your workspace</p><nav aria-label="Primary navigation" className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => { const active = location === href; return <Link key={href} href={href} className={`nav-link ${active ? "is-active" : ""}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{active && <span className="nav-indicator" aria-hidden="true" />}</Link>; })}</nav></div><div className="rail-note"><Sparkles size={17} /><p><strong>Small steps count.</strong><br />Keep the next concept close.</p></div><div className="rail-footer"><div className="avatar">AM</div><div><p className="font-semibold text-sm">Alex Morgan</p><p className="text-xs text-muted-foreground">Student profile</p></div></div></aside>
    <div className="platform-main"><header className="platform-header"><div className="mobile-brand"><div className="brand-mark" aria-hidden="true"><span /><span /></div><span>Study Hall</span></div><div className="header-context"><p className="eyebrow">Monday, 17 August 2026</p><p className="header-title">Make the next concept easier to hold.</p></div><div className="header-actions"><button className="icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} /></button><button className="icon-button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={18} /></button><div className="header-avatar">AM</div></div></header><main className="content-wrap"><Switch><Route path="/" component={() => <Home />} /><Route path="/subjects" component={() => <Home variant="subjects" />} /><Route path="/progress" component={() => <Home variant="progress" />} /><Route path="/resources" component={() => <Home variant="resources" />} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></main></div>
    {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
    {planAdded && <div className="plan-toast" role="status"><CheckCircle2 size={17} /><div><strong>Study block saved</strong><span>{mockPlan.schedule}</span></div><button className="icon-button" onClick={() => setPlanAdded(false)} aria-label="Dismiss study plan confirmation"><X size={15} /></button></div>}
  </div>;
}

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><PlatformShell /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
