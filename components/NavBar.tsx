"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileRow) setProfile(profileRow as Profile);

      const refreshUnread = async () => {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null);
        setUnread(count ?? 0);
      };
      await refreshUnread();

      const channel = supabase
        .channel("nav-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => refreshUnread()
        )
        .subscribe();

      unsub = () => supabase.removeChannel(channel);
    })();

    return () => unsub?.();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      pathname === href || pathname?.startsWith(href + "/")
        ? "bg-fel-panel2 text-white"
        : "text-neutral-400 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-fel-border bg-fel-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fel-icon.svg" alt="FEL" width={22} height={22} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Load List
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Load lists
            </Link>
            <Link href="/notifications" className={linkClass("/notifications")}>
              <span className="sm:hidden">Alerts</span>
              <span className="hidden sm:inline">Notifications</span>
              {unread > 0 && (
                <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-fel-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            {profile?.is_admin && (
              <Link href="/admin/team" className={linkClass("/admin/team")}>
                Team
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span
            aria-hidden
            className="hidden select-none text-lg font-bold italic leading-none text-fel-red sm:inline"
          >
            //
          </span>
          {profile && (
            <div className="text-right leading-tight">
              <div className="max-w-[6rem] truncate text-sm font-medium sm:max-w-none">
                {profile.full_name}
              </div>
              <div className="hidden text-xs uppercase tracking-wide text-neutral-500 sm:block">
                {profile.role === "manager" ? "Warehouse Manager" : "Team member"}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-md border border-fel-border px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-fel-panel2 sm:px-3"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
