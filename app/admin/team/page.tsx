"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import type { Profile } from "@/lib/types";

export default function AdminTeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("staff");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    setProfiles((data as Profile[]) ?? []);
  }

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;
      const { data: me } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(!!me?.is_admin);
      await refresh();
    })();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!email.trim() || !fullName.trim()) {
      setError("Email and name are required.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    setMessage(`Invite sent to ${email}.`);
    setEmail("");
    setFullName("");
    setRole("staff");
    await refresh();
  }

  async function changeRole(userId: string, newRole: string) {
    await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    await refresh();
  }

  if (isAdmin === false) {
    return (
      <div>
        <NavBar />
        <p className="p-8 text-sm text-neutral-500">
          You don&apos;t have access to this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold uppercase tracking-wide">Team</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Invite a team member or set who the warehouse manager is. Invited
          people get an email with a link to set their own password.
        </p>

        <form
          onSubmit={handleInvite}
          className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-fel-border bg-fel-panel p-5 sm:grid-cols-4"
        >
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red sm:col-span-2"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@feldrives.com"
            className="rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red sm:col-span-2"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
          >
            <option value="staff">Team member</option>
            <option value="manager">Warehouse manager</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-fel-red px-4 py-2 text-sm font-medium text-white hover:bg-fel-red/90 disabled:opacity-50 sm:col-span-1"
          >
            {sending ? "Sending..." : "Send invite"}
          </button>
          {message && (
            <p className="text-sm text-fel-green sm:col-span-4">{message}</p>
          )}
          {error && (
            <p className="text-sm text-fel-red sm:col-span-4">{error}</p>
          )}
        </form>

        <div className="overflow-x-auto rounded-xl border border-fel-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-fel-panel2 text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-fel-border">
                  <td className="px-4 py-2">
                    {p.full_name}
                    {p.is_admin && (
                      <span className="ml-2 rounded-full bg-fel-red/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-fel-red">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{p.email}</td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={p.role}
                      onChange={(e) => changeRole(p.id, e.target.value)}
                      className="rounded-md border border-fel-border bg-fel-panel2 px-2 py-1 text-xs"
                    >
                      <option value="staff">Team member</option>
                      <option value="manager">Warehouse manager</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
