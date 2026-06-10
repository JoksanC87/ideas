import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { withBypass } from "@/lib/db";

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { orgId } = await req.json();

  const ok = await withBypass(async (tx) => {
    const dbUser = await tx.user.findFirst({ where: { OR: [{ authId: user.id }, { email: user.email! }] }, include: { memberships: true } });
    return !!dbUser?.memberships.some((m) => m.orgId === orgId);
  });
  if (!ok) return NextResponse.json({ error: "Sin membresía en esa organización" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_org", orgId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
