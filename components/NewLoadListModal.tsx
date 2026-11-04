"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ModeField from "@/components/ModeField";
import type { Profile } from "@/lib/types";

export default function NewLoadListModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (listId: string) => void;
}) {
  const [program, setProgram] = useState("");
  const [contactName, setContactName] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff")
        .order("full_name", { ascending: true });
      const rows = (data as Profile[]) ?? [];
      setTeamMembers(rows.filter((p) => p.id !== userRes.user?.id));
    })();
  }, []);

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!program.trim() || !contactName.trim() || !location.trim()) {
      setError("Program, contact, and location are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setError("You're not signed in.");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from("load_lists")
      .insert({
        program: program.trim(),
        contact_name: contactName.trim(),
        location: location.trim(),
        mode: mode.trim(),
        depart_date: departDate || null,
        return_date: returnDate || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      setError(error?.message ?? "Something went wrong.");
      return;
    }
    if (selectedMembers.size > 0) {
      // Goes through the API route (not a direct client insert) so each
      // newly-added teammate gets an email about the new load list.
      await fetch(`/api/lists/${data.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: Array.from(selectedMembers) }),
      });
    }
    setSaving(false);
    onCreated(data.id);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-fel-border bg-fel-panel p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">
          New load list
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Program
            </label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. Kia National Dealer Meeting"
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Program lead / contact
              </label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Destination
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City / venue"
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModeField value={mode} onChange={setMode} />
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Depart
              </label>
              <input
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Return
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Who can view this load list
            </label>
            <p className="mb-2 text-xs text-neutral-500">
              You and the warehouse manager always have access. Pick anyone
              else on the team who should see it too.
            </p>
            {teamMembers.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No other team members yet.
              </p>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-fel-border bg-fel-panel2 p-2">
                {teamMembers.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-fel-panel"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="h-4 w-4 accent-fel-red"
                    />
                    {m.full_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-fel-red/10 px-3 py-2 text-sm text-fel-red">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-fel-border px-4 py-2 text-sm text-neutral-300 hover:bg-fel-panel2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-fel-red px-4 py-2 text-sm font-medium uppercase tracking-wide text-white hover:bg-fel-red/90 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create load list"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
