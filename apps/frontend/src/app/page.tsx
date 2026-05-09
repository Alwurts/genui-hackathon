"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LENS_PRESETS } from "@/lib/review/lenses";

const PR_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/i;

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!PR_URL_RE.test(trimmed)) {
      setError(
        "That doesn't look like a GitHub PR URL. Expected: https://github.com/owner/repo/pull/123",
      );
      return;
    }
    setError(null);
    router.push(`/review?pr=${encodeURIComponent(trimmed)}`);
  };

  const handleDemo = () => {
    router.push("/review");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-12">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Lens-driven PR review
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Paste a public GitHub pull request URL. Pick a lens (money,
            architecture, tests). The agent re-ranks every diff hunk under
            that lens — same PR, different review.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <label
            htmlFor="pr-url"
            className="mb-2 block text-sm font-medium"
          >
            GitHub pull request URL
          </label>
          <input
            id="pr-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-xs text-rose-600">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button type="submit" size="lg" disabled={!url.trim()}>
              Review this PR
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDemo}
            >
              Try the cached demo PR
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Public repos work without any GitHub token (rate-limited to 60
            requests/hour). The cached demo runs against hand-crafted data —
            no API key needed.
          </p>
        </form>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {LENS_PRESETS.map((lens) => (
            <div
              key={lens.id}
              className="rounded-xl border border-border bg-card/50 p-4"
            >
              <h2 className="text-sm font-semibold">{lens.name}</h2>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {lens.instruction.split(".")[0]}.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
