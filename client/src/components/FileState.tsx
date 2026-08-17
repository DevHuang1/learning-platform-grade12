// Editorial Study Hall: file states share one semantic surface, icon treatment, and recovery language across every resource workflow.
import { AlertTriangle, FileQuestion, Loader2, RefreshCw } from "lucide-react";

type FileStateVariant = "loading" | "empty" | "error";
export function FileState({ variant, title, description, actionLabel = "Try again", onAction }: { variant: FileStateVariant; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const icon = variant === "loading" ? <Loader2 className="file-state-spinner" size={22} /> : variant === "error" ? <AlertTriangle size={22} /> : <FileQuestion size={22} />;
  return <div className={`file-state file-state-${variant}`} role={variant === "error" ? "alert" : "status"}><div className="file-state-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{onAction && <button className="outline-button file-state-action" onClick={onAction}><RefreshCw size={14} /> {actionLabel}</button>}</div>;
}

export function FilePreview({ title, metadata, children, onClose }: { title: string; metadata: string; children: React.ReactNode; onClose: () => void }) {
  return <section className="file-preview" role="dialog" aria-modal="true" aria-label={`${title} preview`}><div className="file-preview-head"><div><p className="eyebrow text-primary">File preview</p><h2>{title}</h2><p className="text-muted-foreground">{metadata}</p></div><button className="icon-button" onClick={onClose} aria-label="Close preview">×</button></div><div className="file-preview-body">{children}</div></section>;
}
