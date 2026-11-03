"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import AddItemForm from "@/components/AddItemForm";
import CommentDrawer from "@/components/CommentDrawer";
import ModeField from "@/components/ModeField";
import ManageAccessPanel from "@/components/ManageAccessPanel";
import {
  STATUS_LABEL,
  type LoadList,
  type LoadListItem,
  type LoadListStatus,
  type Profile,
} from "@/lib/types";

export default function LoadListDetailPage() {
  return (
    <Suspense fallback={null}>
      <LoadListDetailInner />
    </Suspense>
  );
}

function LoadListDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const listId = params.id;

  const [list, setList] = useState<LoadList | null>(null);
  const [items, setItems] = useState<LoadListItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {}
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<LoadListItem | null>(null);
  const [showAccess, setShowAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let unsubItems: (() => void) | undefined;
    let unsubComments: (() => void) | undefined;
    let unsubList: (() => void) | undefined;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      setCurrentUserId(userRes.user?.id ?? null);

      const { data: profileRows } = await supabase.from("profiles").select("*");
      const map: Record<string, Profile> = {};
      (profileRows as Profile[] | null)?.forEach((p) => (map[p.id] = p));
      setProfiles(map);

      const { data: listRow } = await supabase
        .from("load_lists")
        .select("*")
        .eq("id", listId)
        .maybeSingle();
      if (!listRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setList(listRow as LoadList);

      const { data: itemRows } = await supabase
        .from("load_list_items")
        .select("*")
        .eq("load_list_id", listId)
        .order("created_at", { ascending: true });
      setItems((itemRows as LoadListItem[]) ?? []);

      const { data: commentRows } = await supabase
        .from("item_comments")
        .select("item_id")
        .eq("load_list_id", listId);
      const counts: Record<string, number> = {};
      (commentRows as { item_id: string }[] | null)?.forEach((c) => {
        counts[c.item_id] = (counts[c.item_id] ?? 0) + 1;
      });
      setCommentCounts(counts);
      setLoading(false);

      const itemsChannel = supabase
        .channel(`list-items-${listId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "load_list_items",
            filter: `load_list_id=eq.${listId}`,
          },
          (payload) => {
            setItems((prev) => {
              if (payload.eventType === "INSERT") {
                const row = payload.new as LoadListItem;
                if (prev.some((i) => i.id === row.id)) return prev;
                return [...prev, row];
              }
              if (payload.eventType === "UPDATE") {
                const row = payload.new as LoadListItem;
                return prev.map((i) => (i.id === row.id ? row : i));
              }
              if (payload.eventType === "DELETE") {
                const row = payload.old as LoadListItem;
                return prev.filter((i) => i.id !== row.id);
              }
              return prev;
            });
          }
        )
        .subscribe();
      unsubItems = () => supabase.removeChannel(itemsChannel);

      const commentsChannel = supabase
        .channel(`list-comments-${listId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "item_comments",
            filter: `load_list_id=eq.${listId}`,
          },
          (payload) => {
            const row = payload.new as { item_id: string };
            setCommentCounts((prev) => ({
              ...prev,
              [row.item_id]: (prev[row.item_id] ?? 0) + 1,
            }));
          }
        )
        .subscribe();
      unsubComments = () => supabase.removeChannel(commentsChannel);

      const listChannel = supabase
        .channel(`list-header-${listId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "load_lists",
            filter: `id=eq.${listId}`,
          },
          (payload) => setList(payload.new as LoadList)
        )
        .subscribe();
      unsubList = () => supabase.removeChannel(listChannel);
    })();

    return () => {
      unsubItems?.();
      unsubComments?.();
      unsubList?.();
    };
  }, [listId]);

  useEffect(() => {
    const openId = searchParams.get("item");
    if (openId && items.length) {
      const match = items.find((i) => i.id === openId);
      if (match) setActiveItem(match);
    }
  }, [searchParams, items]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  const grouped = useMemo(() => {
    const map: Record<string, LoadListItem[]> = {};
    for (const item of items) {
      map[item.category] = map[item.category] ?? [];
      map[item.category].push(item);
    }
    return map;
  }, [items]);

  async function updateHeaderField(field: string, value: string) {
    const supabase = createClient();
    await supabase.from("load_lists").update({ [field]: value }).eq("id", listId);
  }

  async function togglePacked(item: LoadListItem) {
    const supabase = createClient();
    await supabase
      .from("load_list_items")
      .update({ packed: !item.packed, updated_by: currentUserId })
      .eq("id", item.id);
  }

  async function deleteItem(item: LoadListItem) {
    if (!confirm(`Remove "${item.name}" from this load list?`)) return;
    const supabase = createClient();
    await supabase.from("load_list_items").delete().eq("id", item.id);
  }

  if (notFound) {
    return (
      <div>
        <NavBar />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-neutral-500">
          <p>
            This load list doesn&apos;t exist, or you don&apos;t have access
            to it. Ask whoever created it to add you under &ldquo;Manage
            access&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !list) {
    return (
      <div>
        <NavBar />
        <p className="p-8 text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  const packedCount = items.filter((i) => i.packed).length;

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-xl border border-fel-border bg-fel-panel p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <input
              defaultValue={list.program}
              onBlur={(e) => updateHeaderField("program", e.target.value)}
              className="w-full bg-transparent text-xl font-semibold uppercase tracking-wide outline-none focus:border-b focus:border-fel-red"
            />
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/api/lists/${listId}/pdf`}
                className="rounded-full border border-fel-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-300 hover:bg-fel-panel2"
              >
                Export PDF
              </a>
              <button
                onClick={() => setShowAccess(true)}
                className="rounded-full border border-fel-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-300 hover:bg-fel-panel2"
              >
                Manage access
              </button>
              <select
                defaultValue={list.status}
                onChange={(e) => updateHeaderField("status", e.target.value as LoadListStatus)}
                className="rounded-full border border-fel-border bg-fel-panel2 px-3 py-1 text-xs font-medium uppercase tracking-wide"
              >
                {Object.entries(STATUS_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
            <Field label="Program lead / contact" defaultValue={list.contact_name} onBlur={(v) => updateHeaderField("contact_name", v)} />
            <Field label="Destination" defaultValue={list.location} onBlur={(v) => updateHeaderField("location", v)} />
            <ModeField value={list.mode} onChange={(v) => updateHeaderField("mode", v)} />
            <Field label="Depart" type="date" defaultValue={list.depart_date ?? ""} onBlur={(v) => updateHeaderField("depart_date", v)} />
            <Field label="Return" type="date" defaultValue={list.return_date ?? ""} onBlur={(v) => updateHeaderField("return_date", v)} />
          </div>
          <div className="mt-4 text-xs uppercase tracking-wide text-neutral-500">
            {packedCount} / {items.length} items packed
          </div>
        </div>

        <div className="space-y-6">
          {categories.length === 0 && (
            <div className="rounded-xl border border-dashed border-fel-border p-8 text-center text-neutral-500">
              No items yet. Add the first one below.
            </div>
          )}
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                {cat}
              </h2>
              <div className="overflow-hidden rounded-xl border border-fel-border">
                <table className="w-full text-sm">
                  <tbody>
                    {grouped[cat].map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-fel-border/60 last:border-0 hover:bg-fel-panel2/60"
                      >
                        <td className="w-10 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={item.packed}
                            onChange={() => togglePacked(item)}
                            className="h-4 w-4 accent-fel-green"
                          />
                        </td>
                        <td
                          className={`px-3 py-2 ${item.packed ? "text-neutral-500 line-through" : ""}`}
                        >
                          {item.name}
                        </td>
                        <td className="w-20 px-3 py-2 text-neutral-400">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-neutral-400">
                          {item.notes}
                        </td>
                        <td className="w-24 px-3 py-2 text-right">
                          <button
                            onClick={() => setActiveItem(item)}
                            className="rounded-md border border-fel-border px-2 py-1 text-xs text-neutral-300 hover:bg-fel-panel2"
                          >
                            💬 {commentCounts[item.id] ?? 0}
                          </button>
                        </td>
                        <td className="w-8 px-2 py-2 text-right">
                          <button
                            onClick={() => deleteItem(item)}
                            className="text-neutral-500 hover:text-fel-red"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {currentUserId && (
                <div className="mt-2">
                  <AddItemForm
                    loadListId={listId}
                    categories={categories}
                    currentUserId={currentUserId}
                    defaultCategory={cat}
                  />
                </div>
              )}
            </div>
          ))}

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Add to a new category
            </h2>
            {currentUserId && (
              <AddItemForm
                loadListId={listId}
                categories={categories}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </main>

      {activeItem && currentUserId && (
        <CommentDrawer
          item={activeItem}
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setActiveItem(null)}
        />
      )}

      {showAccess && currentUserId && (
        <ManageAccessPanel
          loadListId={listId}
          currentUserId={currentUserId}
          onClose={() => setShowAccess(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onBlur,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  onBlur: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <input
        type={type}
        defaultValue={defaultValue}
        onBlur={(e) => onBlur(e.target.value)}
        className="w-full rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
      />
    </div>
  );
}
