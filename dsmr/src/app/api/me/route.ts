import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { withBypass } from "@/lib/db";

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const data = await withBypass(async (tx) => {
    const dbUser = await tx.user.findFirst({
      where: { OR: [{ authId: user.id }, { email: user.email! }] },
      include: { memberships: { include: { org: { select: { id: true, name: true } } } } },
    });
    if (!dbUser) return { user: { email: user.email }, orgs: [] };
    return {
      user: { id: dbUser.id, email: dbUser.email, name: dbUser.name },
      orgs: dbUser.memberships.map((m) => ({ id: m.org.id, name: m.org.name, role: m.role })),
    };
  });
  return NextResponse.json(data);
}
