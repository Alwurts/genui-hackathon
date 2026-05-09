import type { PR } from "@/lib/review/types";

export function PRHeader({ pr }: { pr: PR | null }) {
  if (!pr) {
    return (
      <header className="rounded-xl border border-border bg-card px-5 py-4">
        <h1 className="text-lg font-semibold">Lens-driven PR review</h1>
        <p className="text-sm text-muted-foreground">
          No PR loaded. Paste a PR URL in the chat or ask the assistant to
          review one.
        </p>
      </header>
    );
  }
  return (
    <header className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{pr.title}</h1>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{pr.author}</span>
            {" · "}
            <span className="font-mono">{pr.base}</span>
            {" ← "}
            <span className="font-mono">{pr.head}</span>
          </p>
        </div>
        <dl className="flex shrink-0 gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground">files</dt>
            <dd className="font-mono">{pr.files_changed}</dd>
          </div>
          <div>
            <dt className="text-emerald-600">+</dt>
            <dd className="font-mono text-emerald-600">{pr.additions}</dd>
          </div>
          <div>
            <dt className="text-rose-600">−</dt>
            <dd className="font-mono text-rose-600">{pr.deletions}</dd>
          </div>
        </dl>
      </div>
      <a
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {pr.url}
      </a>
    </header>
  );
}
