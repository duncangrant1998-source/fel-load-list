"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import NewLoadListModal from "@/components/NewLoadListModal";
import { STATUS_LABEL, type LoadList } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-fel-green/20 text-fel-green",
  departed: "bg-fel-red/20 text-fel-red",
  returned: "bg-neutral-500/20 text-neutral-300",
  archived: "bg-neutral-700/40 text-neutral-500",
};

export default function DashboardPage() {
  const router = useRouter();
  const [lists, setLists] = useState<LoadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase
        .from("load_lists")
        .select("*")
        .order("created_at", { ascending: false });
      setLists((data as LoadList[]) ?? []);
      setLoading(false);

      const channel = supabase
        .channel("dashboard-lists")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "load_lists" },
          (payload) => {
            setLists((prev) => {
              if (payload.eventType === "INSERT") {
                const row = payload.new as LoadList;
                if (prev.some((l) => l.id === row.id)) return prev;
                return [row, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const row = payload.new as LoadList;
                return prev.map((l) => (l.id === row.id ? row : l));
              }
              if (payload.eventType === "DELETE") {
                const row = payload.old as LoadList;
                return prev.filter((l) => l.id !== row.id);
              }
              return prev;
            });
          }
        )
        .subscribe();

      unsub = () => supabase.removeChannel(channel);
    })();

    return () => unsub?.();
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? lists : lists.filter((l) => l.status === filter)),
    [lists, filter]
  );

  async function handleDelete(e: React.MouseEvent, list: LoadList) {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${list.program || "this load list"}"? This permanently removes it and everything on it — items, comments, and access. This can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(list.id);
    const supabase = createClient();
    const { error } = await supabase.from("load_lists").delete().eq("id", list.id);
    setDeletingId(null);
    if (error) {
      window.alert(`Couldn't delete that load list: ${error.message}`);
      return;
    }
    setLists((prev) => prev.filter((l) => l.id !== list.id));
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-wide">
              Load lists
            </h1>
            <p className="text-sm text-neutral-400">
              Create a load list for an upcoming program and keep the
              warehouse manager posted as items go in.
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="shrink-0 rounded-lg bg-fel-red px-4 py-2 text-sm font-medium uppercase tracking-wide text-white hover:bg-fel-red/90 sm:self-start"
          >
            + New load list
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {["all", "active", "departed", "returned", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === s
                  ? "bg-fel-panel2 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-fel-border p-10 text-center text-neutral-500">
            No load lists yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((list) => (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/lists/${list.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/lists/${list.id}`);
                  }
                }}
                className="flex cursor-pointer flex-col rounded-xl border border-fel-border bg-fel-panel p-4 text-left transition hover:border-fel-red"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{list.program}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[list.status]}`}
                    >
                      {STATUS_LABEL[list.status]}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, list)}
                      disabled={deletingId === list.id}
                      aria-label={`Delete ${list.program || "load list"}`}
                      title="Delete load list"
                      className="rounded-md p-1 text-neutral-500 transition hover:bg-fel-red/10 hover:text-fel-red disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <dl className="space-y-1 text-xs text-neutral-400">
                  <div className="flex gap-1">
                    <dt className="font-medium text-neutral-300">Contact:</dt>
                    <dd>{list.contact_name}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="font-medium text-neutral-300">To:</dt>
                    <dd>{list.location}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="font-medium text-neutral-300">Mode:</dt>
                    <dd>{list.mode}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="font-medium text-neutral-300">Dates:</dt>
                    <dd>
                      {list.depart_date ?? "TBD"} → {list.return_date ?? "TBD"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewLoadListModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            router.push(`/lists/${id}`);
          }}
        />
      )}
    </div>
  );
}
