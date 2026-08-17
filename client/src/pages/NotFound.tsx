// Editorial Study Hall: even fallback states inherit the platform shell tokens and editorial type hierarchy instead of introducing a separate visual language.
import { Link } from "wouter";

export default function NotFound() {
  return <div className="page-enter max-w-xl py-16"><p className="eyebrow text-primary">Page not found</p><h1>Let’s return to the study desk.</h1><p className="lede">That page is not part of this workspace, but your next useful step is still close.</p><Link href="/" className="primary-button mt-8">Back to overview</Link></div>;
}
