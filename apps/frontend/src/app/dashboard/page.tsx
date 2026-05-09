"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronRight, X, ArrowUpDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import { cn } from "@/lib/utils";
import {
  DEMO_PRS,
  LENSES,
  type LensName,
  type PRCategory,
  type DemoPR,
} from "@/data/demoPRs";

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_DISPLAY: Record<PRCategory, string> = {
  security: "Security",
  database: "Database",
  backend: "Backend API",
  frontend: "Frontend",
  tests: "Tests",
  docs: "Docs",
  infra: "Infra",
  perf: "Performance",
};

const ALL_CATEGORIES: PRCategory[] = [
  "security",
  "database",
  "backend",
  "frontend",
  "tests",
  "docs",
  "infra",
  "perf",
];

// Active chip color classes (filled state per category)
const CATEGORY_ACTIVE_CHIP: Record<PRCategory, string> = {
  security: "bg-red-100 text-red-700 border-red-200",
  database: "bg-blue-100 text-blue-700 border-blue-200",
  backend: "bg-emerald-100 text-emerald-700 border-emerald-200",
  frontend: "bg-amber-100 text-amber-700 border-amber-200",
  tests: "bg-purple-100 text-purple-700 border-purple-200",
  docs: "bg-zinc-200 text-zinc-700 border-zinc-300",
  infra: "bg-cyan-100 text-cyan-700 border-cyan-200",
  perf: "bg-pink-100 text-pink-700 border-pink-200",
};

// ─── Constants ───────────────────────────────────────────────────────────────

const REPO_ITEMS = [
  { label: "genui-hackathon", count: 12 },
  { label: "api-gateway", count: 18 },
  { label: "web-app", count: 8 },
  { label: "data-pipeline", count: 4 },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DemoPR["status"], { dot: string; label: string; pill: string }> = {
  open:   { dot: "bg-green-500", label: "Open",   pill: "bg-green-50 text-green-700 border-green-200" },
  review: { dot: "bg-amber-400", label: "Review", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  draft:  { dot: "bg-zinc-400",  label: "Draft",  pill: "bg-zinc-100 text-zinc-500 border-zinc-200"  },
};

function StatusBadge({ status }: { status: DemoPR["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0", cfg.pill)}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── PR row ───────────────────────────────────────────────────────────────────

function PRRow({
  pr,
  activeLens,
  onClick,
  onChatOpen,
}: {
  pr: DemoPR;
  activeLens: LensName;
  onClick: () => void;
  onChatOpen: () => void;
}) {
  const relevance = pr.relevance[activeLens] ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* PR info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground truncate">
            {pr.title}
          </span>
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            #{pr.id}
          </span>
          <StatusBadge status={pr.status} />
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground shrink-0">
            {pr.repo}
          </span>
          <span className="text-xs text-muted-foreground">
            {pr.author} · {pr.age} ago · +{pr.additions}{" "}
            <span className="text-red-500">−{pr.deletions}</span>
          </span>
          <span className="flex gap-1 flex-wrap">
            {pr.categories.map((cat) => (
              <Badge key={cat} variant={cat} className="text-[10px] px-1.5 py-0">
                {CATEGORY_DISPLAY[cat]}
              </Badge>
            ))}
          </span>
        </div>
      </div>

      {/* Relevance */}
      <div className="flex flex-col items-end gap-1 shrink-0" style={{ minWidth: 80 }}>
        <span className="text-xs text-muted-foreground">{relevance}% relevant</span>
        <div
          className="rounded-full overflow-hidden bg-border"
          style={{ width: 56, height: 3 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${relevance}%`,
              backgroundColor: "#BEC2FF",
            }}
          />
        </div>
      </div>

      {/* Concerns */}
      <div className="shrink-0 text-right" style={{ minWidth: 72 }}>
        {pr.concerns > 0 ? (
          <span className="text-xs font-medium text-amber-600">
            {pr.concerns} concern{pr.concerns !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">clean</span>
        )}
      </div>

      {/* Chat button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChatOpen(); }}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Open chat for this PR"
      >
        <MessageSquare className="size-3.5" />
      </button>

      {/* Chevron */}
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [activeLens, setActiveLens] = useState<LensName>("Backend");
  const [activeFilters, setActiveFilters] = useState<Set<PRCategory>>(new Set());
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Chat dock state
  type ChatTab = { id: string; label: string };
  const mainTab: ChatTab = { id: "main", label: "Main" };
  const [openTabs, setOpenTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("main");
  const [chatOpen, setChatOpen] = useState(false);

  function openFAB() {
    setOpenTabs((prev) => prev.find((t) => t.id === "main") ? prev : [mainTab, ...prev]);
    setActiveTabId("main");
    setChatOpen((v) => !v);
  }

  function openPRChat(pr: DemoPR) {
    const id = `pr-${pr.id}`;
    const label = `#${pr.id} ${pr.title}`;
    setOpenTabs((prev) => prev.find((t) => t.id === id) ? prev : [...prev, { id, label }]);
    setActiveTabId(id);
    setChatOpen(true);
  }

  function closeTab(id: string) {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const fallback = next[next.length - 1];
        setActiveTabId(fallback?.id ?? "main");
        if (!fallback) setChatOpen(false);
      }
      return next;
    });
  }

  // Sidebar inbox items
  const inboxItems = [
    { label: "Assigned to me", count: 7, active: true },
    { label: "Mentioned", count: 3, active: false },
    { label: "Authored", count: 2, active: false },
    { label: "All open", count: 42, active: false },
  ];

  // Repo filter helpers
  function toggleRepo(repo: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repo)) next.delete(repo);
      else next.add(repo);
      return next;
    });
  }

  // Toggle a category filter chip
  function toggleFilter(cat: PRCategory) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  // Filter + sort PRs
  const filteredPRs = DEMO_PRS.filter((pr) => {
    if (selectedRepos.size > 0 && !selectedRepos.has(pr.repo)) return false;
    if (activeFilters.size > 0) {
      const hasMatch = pr.categories.some((c) => activeFilters.has(c));
      if (!hasMatch) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !pr.title.toLowerCase().includes(q) &&
        !pr.repo.toLowerCase().includes(q) &&
        !pr.author.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => (b.relevance[activeLens] ?? 0) - (a.relevance[activeLens] ?? 0));

  const hasFilters = activeFilters.size > 0;

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col border-r border-border bg-card"
        style={{ width: 240, flexShrink: 0 }}
      >
        {/* Sidebar top — height-matched to topbar */}
        <div className="flex items-center gap-2 px-5 border-b border-border" style={{ height: 52, flexShrink: 0 }}>
          <div className="rounded" style={{ width: 18, height: 18, backgroundColor: "#BEC2FF", flexShrink: 0 }} />
          <span className="font-bold text-sm text-foreground">Team Reviewers</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {/* INBOX section */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground px-2 mb-1">
              INBOX
            </p>
            <ul className="space-y-0.5">
              {inboxItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                      item.active
                        ? "bg-accent/30 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        item.active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* REPOS section */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground px-2 mb-1">
              REPOS
            </p>
            <ul className="space-y-0.5">
              {REPO_ITEMS.map((item) => {
                const isActive = selectedRepos.has(item.label);
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleRepo(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-accent/30 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground ml-1 shrink-0">
                        {item.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Topbar ── */}
        <header className="flex items-center gap-4 px-6 bg-card border-b border-border shrink-0" style={{ height: 52 }}>
          {/* Left: breadcrumb */}
          <span className="text-sm text-muted-foreground shrink-0">Inbox</span>

          {/* Center: search */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search PRs, files, owners…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          </div>

          {/* Right: lens selector, bell, avatar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Viewing as
              </span>
              <Select
                value={activeLens}
                onValueChange={(v) => setActiveLens(v as LensName)}
              >
                <SelectTrigger size="sm" className="h-7 text-xs px-2 gap-1 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENSES.map((lens) => (
                    <SelectItem key={lens} value={lens} className="text-xs">
                      {lens}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" className="size-8">
              <Bell className="size-4" />
            </Button>

            <div
              className="flex items-center justify-center rounded-full text-xs font-semibold text-foreground shrink-0"
              style={{
                width: 30,
                height: 30,
                backgroundColor: "#BEC2FF",
              }}
              aria-label="User avatar"
            >
              iz
            </div>
          </div>
        </header>

        {/* ── Scrollable main content ── */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {/* Heading row */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-foreground">Pull requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredPRs.length} awaiting your review · ordered by lens relevance
            </p>
          </div>

          {/* Filter chips row */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-xs text-muted-foreground shrink-0">Filter:</span>
            {ALL_CATEGORIES.map((cat) => {
              const isActive = activeFilters.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleFilter(cat)}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                    isActive
                      ? CATEGORY_ACTIVE_CHIP[cat]
                      : "border-border text-muted-foreground bg-transparent hover:bg-muted"
                  )}
                >
                  {CATEGORY_DISPLAY[cat]}
                </button>
              );
            })}
            {hasFilters && (
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />
                Reset
              </button>
            )}
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowUpDown className="size-3" />
              Sort
            </button>
          </div>

          {/* PR list */}
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {filteredPRs.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No pull requests match your filters.
              </div>
            ) : (
              filteredPRs.map((pr) => (
                <PRRow
                  key={pr.id}
                  pr={pr}
                  activeLens={activeLens}
                  onClick={() => router.push("/review")}
                  onChatOpen={() => openPRChat(pr)}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {/* ── Chat dock ── */}
      <div className="fixed bottom-5 right-6 z-50 flex items-center gap-2">
        {/* Chat chips — only visible when there are open tabs */}
        {openTabs.length > 0 && (
          <div className="flex items-center gap-2 flex-row-reverse">
            {[...openTabs].reverse().map((tab) => {
              const isActive = tab.id === activeTabId && chatOpen;
              const truncated = tab.label.length > 20 ? tab.label.slice(0, 20) + "…" : tab.label;
              return (
                <div
                  key={tab.id}
                  onClick={() => { setActiveTabId(tab.id); setChatOpen(true); }}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs cursor-pointer select-none transition-colors",
                    isActive
                      ? "bg-card border-border text-foreground font-medium shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground shadow-sm"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  <span className="truncate">{truncated}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB — always visible */}
        <button
          type="button"
          onClick={openFAB}
          className="size-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity shrink-0"
        >
          <MessageSquare className="size-5" />
        </button>
      </div>

      {/* CopilotSidebar — same as review page, toggled by dock */}
      {/* Hide CopilotKit's own FAB so it doesn't overlap ours */}
      <style>{`.copilotKitButton { display: none !important; }`}</style>
      {chatOpen && (
        <CopilotSidebar
          defaultOpen
          width={420}
          input={{ disclaimer: () => null, className: "pb-6" }}
        />
      )}
    </div>
  );
}
