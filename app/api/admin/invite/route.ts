import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: requester } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!requester?.is_admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.fullName ?? "").trim();
  const role = body.role === "manager" ? "manager" : "staff";

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Email and name are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const redirectTo = `${request.nextUrl.origin}/auth/set-password`;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
