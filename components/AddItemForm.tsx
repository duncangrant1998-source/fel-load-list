"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AddItemForm({
  loadListId,
  categories,
  currentUserId,
  defaultCategory,
  onDone,
}: {
  loadListId: string;
  categories: string[];
  currentUserId: string;
  defaultCategory?: string;
  onDone?: () => void;
}) {
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("load_list_items").insert({
      load_list_id: loadListId,
      category: category.trim() || "General",
      name: name.trim(),
      quantity: quantity.trim(),
      notes: notes.trim(),
      created_by: currentUserId,
    });
    setName("");
    setQuantity("");
    setNotes("");
    setSaving(false);
    onDone?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-12 gap-2 rounded-lg border border-dashed border-fel-border bg-fel-panel2/50 p-2"
    >
      <input
        list="categories"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="col-span-2 rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
      />
      <datalist id="categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="col-span-4 rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
      />
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        className="col-span-2 rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="col-span-3 rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="col-span-1 rounded-md bg-fel-red px-2 py-1.5 text-xs font-medium text-white hover:bg-fel-red/90 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
