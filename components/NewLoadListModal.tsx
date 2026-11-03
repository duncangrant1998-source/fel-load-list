"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TRANSPORT_MODES } from "@/lib/types";

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
  const [mode, setMode] = useState(TRANSPORT_MODES[0]);
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        mode,
        depart_date: departDate || null,
        return_date: returnDate || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      setError(error?.message ?? "Something went wrong.");
      return;
    }
    onCreated(data.id);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-fel-border bg-fel-panel p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold">New load list</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Program
            </label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. Kia National Dealer Meeting"
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Program lead / contact
              </label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
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
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                Depart
              </label>
              <input
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
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
                className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
              />
            </div>
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
              className="rounded-lg bg-fel-red px-4 py-2 text-sm font-medium text-white hover:bg-fel-red/90 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create load list"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
