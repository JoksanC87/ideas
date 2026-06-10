import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { updateEvidenceSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "evidence:validate")) return forbidden();
  const { id } = await params;
  try {
    const input = updateEvidenceSchema.parse(await req.json());
    const ev = await withTenant(ctx.orgId, async (tx) => {
      const updated = await tx.evidence.update({ where: { id }, data: { validated: input.validated, type: input.type as any, title: input.title } });
      await tx.auditLog.create({ data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "Evidence", entityId: id, action: "update", after: input as any } });
      return updated;
    });
    return NextResponse.json({ evidence: ev });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "response:write")) return forbidden();
  const { id } = await params;
  await withTenant(ctx.orgId, (tx) => tx.evidence.delete({ where: { id } }));
  return NextResponse.json({ ok: true });
}
