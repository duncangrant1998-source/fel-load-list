"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function ManageAccessPanel({
  loadListId,
  currentUserId,
  onClose,
}: {
  loadListId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: profiles }, { data: members }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "staff").order("full_name"),
        supabase
          .from("load_list_members")
          .select("user_id")
          .eq("load_list_id", loadListId),
      ]);
      setTeamMembers((profiles as Profile[]) ?? []);
      setMemberIds(
        new Set(((members as { user_id: string }[]) ?? []).map((m) => m.user_id))
      );
      setLoading(false);
    })();
  }, [loadListId]);

  async function toggleMember(userId: string) {
    const isMember = memberIds.has(userId);
    if (isMember) {
      const supabase = createClient();
      await supabase
        .from("load_list_members")
        .delete()
        .eq("load_list_id", loadListId)
        .eq("user_id", userId);
      setMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } else {
      // Goes through the API route (not a direct client insert) so the
      // newly-added teammate gets an email about it.
      await fetch(`/api/lists/${loadListId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] }),
      });
      setMemberIds((prev) => new Set(prev).add(userId));
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-fel-border bg-fel-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold uppercase tracking-wide">
            Manage access
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-fel-panel2 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-neutral-500">
          The creator, admins, and the warehouse manager always have access.
          Toggle anyone else on the team who should see this load list.
        </p>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-neutral-500">No other team members yet.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {teamMembers.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fel-panel2"
              >
                <input
                  type="checkbox"
                  checked={memberIds.has(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="h-4 w-4 accent-fel-red"
                />
                {m.full_name}
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-fel-red px-4 py-2 text-sm font-medium uppercase tracking-wide text-white hover:bg-fel-red/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
