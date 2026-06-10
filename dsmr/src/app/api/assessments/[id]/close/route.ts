import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest, conflict } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { recompute } from "@/lib/recompute";
import { closeAssessmentSchema } from "@/lib/schemas";

/**
 * Gate humano: cierra el assessment SOLO si (1) ya corrió la evaluación AI y
 * (2) un revisor con permiso aprueba explícitamente. Recalcula el snapshot final.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "assessment:close")) return forbidden();
  const { id } = await params;

  try {
    const { approved, note } = closeAssessmentSchema.parse(await req.json());
    if (!approved) return badRequest("Se requiere aprobación explícita (approved=true).");

    const result = await withTenant(ctx.orgId, async (tx) => {
      const a = await tx.assessment.findUniqueOrThrow({ where: { id }, select: { aiEvaluatedAt: true, status: true } });
      if (!a.aiEvaluatedAt) return { gate: false as const };

      const { result } = await recompute(tx, id);
      await tx.assessment.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date(), gateApprovedById: ctx.userId, gateApprovedAt: new Date() },
      });
      await tx.auditLog.create({ data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "Assessment", entityId: id, action: "close", after: { global: result.global, note } } });
      return { gate: true as const, result };
    });

    if (!result.gate) return conflict("Requiere evaluación AI antes de cerrar (POST /ai-evaluate).");
    return NextResponse.json({ ok: true, result: result.result });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
