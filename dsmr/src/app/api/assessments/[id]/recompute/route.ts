import { NextRequest, NextResponse } from "next/server";
import { getContext, can, unauthorized, forbidden } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { recompute } from "@/lib/recompute";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "recompute")) return forbidden();
  const { id } = await params;

  const data = await withTenant(ctx.orgId, async (tx) => {
    const { result, recommendations } = await recompute(tx, id);
    await tx.auditLog.create({
      data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "Assessment", entityId: id, action: "recompute", after: { global: result.global, confidence: result.confScore } },
    });
    return { result, recommendations };
  });

  return NextResponse.json(data);
}
