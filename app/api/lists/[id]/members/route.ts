import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAddedToListEmail, sendEmail } from "@/lib/email";
import type { LoadList, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userIds: string[] = Array.isArray(body?.user_ids)
    ? body.user_ids.filter((v: unknown) => typeof v === "string")
    : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "user_ids is required." }, { status: 400 });
  }

  // RLS enforces who's allowed to grant access; this insert fails for
  // anyone who isn't the list's creator, an admin, or the manager.
  const { data: inserted, error: insertError } = await supabase
    .from("load_list_members")
    .upsert(
      userIds.map((user_id) => ({
        load_list_id: params.id,
        user_id,
        added_by: user.id,
      })),
      { onConflict: "load_list_id,user_id", ignoreDuplicates: true }
    )
    .select("user_id");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const addedUserIds = (inserted as { user_id: string }[] | null)?.map((r) => r.user_id) ?? userIds;

  // Fetch what the email needs. RLS already confirmed the caller can see
  // this list, and profiles are readable by any signed-in team member.
  const [{ data: listRow }, { data: profileRows }, { data: actorRow }] = await Promise.all([
    supabase.from("load_lists").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("profiles").select("*").in("id", addedUserIds),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const list = listRow as LoadList | null;
  const profiles = (profileRows as Profile[] | null) ?? [];
  const addedByName = (actorRow as { full_name: string } | null)?.full_name ?? "A teammate";

  const emailResults: { user_id: string; ok: boolean; error?: string }[] = [];

  if (list) {
    await Promise.all(
      profiles.map(async (profile) => {
        if (!profile.email) {
          emailResults.push({ user_id: profile.id, ok: false, error: "No email on file." });
          return;
        }
        const { html, text } = buildAddedToListEmail({
          recipientName: profile.full_name || "there",
          addedByName,
          program: list.program,
          contactName: list.contact_name,
          location: list.location,
          mode: list.mode,
          departDate: list.depart_date,
          returnDate: list.return_date,
          listId: list.id,
        });
        const result = await sendEmail({
          to: profile.email,
          subject: `You've been added to the "${list.program}" load list`,
          html,
          text,
        });
        emailResults.push({ user_id: profile.id, ok: result.ok, error: result.error });
      })
    );
  }

  return NextResponse.json({ ok: true, added: addedUserIds, emails: emailResults });
}
