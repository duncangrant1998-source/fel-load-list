"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItemComment, LoadListItem, Profile } from "@/lib/types";

export default function CommentDrawer({
  item,
  profiles,
  currentUserId,
  onClose,
}: {
  item: LoadListItem;
  profiles: Record<string, Profile>;
  currentUserId: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase
        .from("item_comments")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: true });
      setComments((data as ItemComment[]) ?? []);

      const channel = supabase
        .channel(`comments-${item.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "item_comments",
            filter: `item_id=eq.${item.id}`,
          },
          (payload) => {
            const row = payload.new as ItemComment;
            setComments((prev) =>
              prev.some((c) => c.id === row.id) ? prev : [...prev, row]
            );
          }
        )
        .subscribe();

      unsub = () => supabase.removeChannel(channel);
    })();

    return () => unsub?.();
  }, [item.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("item_comments").insert({
      item_id: item.id,
      load_list_id: item.load_list_id,
      author_id: currentUserId,
      body: body.trim(),
    });
    setBody("");
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-md flex-col border-l border-fel-border bg-fel-panel">
        <div className="flex items-start justify-between border-b border-fel-border p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              {item.category}
            </div>
            <h3 className="font-semibold">{item.name}</h3>
            <div className="text-xs text-neutral-400">
              Qty: {item.quantity || "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-fel-panel2 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {comments.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No comments yet on this item.
            </p>
          ) : (
            comments.map((c) => {
              const author = profiles[c.author_id];
              const isManager = author?.role === "manager";
              return (
                <div key={c.id} className="rounded-lg bg-fel-panel2 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {author?.full_name ?? "Unknown"}
                    </span>
                    {isManager && (
                      <span className="rounded-full bg-fel-amber/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-fel-amber">
                        Warehouse Manager
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-500">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-neutral-200">
                    {c.body}
                  </p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-fel-border p-4">
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a question or leave a note..."
              className="flex-1 rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="rounded-lg bg-fel-red px-4 py-2 text-sm font-medium text-white hover:bg-fel-red/90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
