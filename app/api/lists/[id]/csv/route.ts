import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildItemsCsv } from "@/lib/csv";
import type { LoadList, LoadListItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: list } = await supabase
    .from("load_lists")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json(
      { error: "Load list not found, or you don't have access to it." },
      { status: 404 }
    );
  }

  const { data: itemRows } = await supabase
    .from("load_list_items")
    .select("*")
    .eq("load_list_id", params.id)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  const items = (itemRows as LoadListItem[] | null) ?? [];
  const csv = buildItemsCsv(items);

  const safeName =
    (list as LoadList).program
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "load-list";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-items.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
