"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import type { AppNotification, Profile } from "@/lib/types";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;
      setUserId(user.id);

      const { data: profileRows } = await supabase.from("profiles").select("*");
      const map: Record<string, Profile> = {};
      (profileRows as Profile[] | null)?.forEach((p) => (map[p.id] = p));
      setProfiles(map);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setNotifications((data as AppNotification[]) ?? []);
      setLoading(false);

      const channel = supabase
        .channel("notifications-page")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => {
              if (payload.eventType === "INSERT") {
                const row = payload.new as AppNotification;
                if (prev.some((n) => n.id === row.id)) return prev;
                return [row, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const row = payload.new as AppNotification;
                return prev.map((n) => (n.id === row.id ? row : n));
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

  async function openNotification(n: AppNotification) {
    const supabase = createClient();
    if (!n.read_at) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
    }
    router.push(`/lists/${n.load_list_id}?item=${n.item_id}`);
  }

  async function markAllRead() {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <button
            onClick={markAllRead}
            className="rounded-md border border-fel-border px-3 py-1.5 text-xs text-neutral-300 hover:bg-fel-panel2"
          >
            Mark all read
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-fel-border p-10 text-center text-neutral-500">
            You're all caught up.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const actor = profiles[n.actor_id];
              const isManager = actor?.role === "manager";
              return (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`block w-full rounded-lg border p-3 text-left transition ${
                    n.read_at
                      ? "border-fel-border bg-fel-panel/60 text-neutral-400"
                      : "border-fel-blue/40 bg-fel-panel"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {actor?.full_name ?? "Someone"}
                    </span>
                    {isManager && (
                      <span className="rounded-full bg-fel-amber/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-fel-amber">
                        Warehouse Manager
                      </span>
                    )}
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-fel-red" />
                    )}
                    <span className="ml-auto text-[11px] text-neutral-500">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    commented on <span className="font-medium">{n.item_name}</span>{" "}
                    <span className="text-neutral-500">· {n.program}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-neutral-400">
                    “{n.snippet}”
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
