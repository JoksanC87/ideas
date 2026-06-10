import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest, conflict } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { updateModelSchema } from "@/lib/schemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:read")) return forbidden();
  const { id } = await params;

  const model = await withTenant(ctx.orgId, (tx) =>
    tx.maturityModel.findUniqueOrThrow({
      where: { id },
      include: {
        dimensions: { orderBy: { order: "asc" } },
        questions: { include: { dimension: { select: { code: true } } }, orderBy: { order: "asc" } },
        _count: { select: { assessments: true } },
      },
    })
  );
  return NextResponse.json({ model });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:write")) return forbidden();
  const { id } = await params;

  try {
    const input = updateModelSchema.parse(await req.json());
    const out = await withTenant(ctx.orgId, async (tx) => {
      const m = await tx.maturityModel.findUniqueOrThrow({ where: { id }, include: { _count: { select: { assessments: true } } } });
      // Reproducibilidad: no se edita un modelo con assessments; clonar primero
      if (m._count.assessments > 0) return { locked: true as const };
      if (m.orgId === null) return { global: true as const }; // el modelo global no se edita; clónalo

      if (input.name || input.levelBands || input.isActive !== undefined) {
        await tx.maturityModel.update({ where: { id }, data: { name: input.name ?? undefined, levelBands: input.levelBands ?? undefined, isActive: input.isActive ?? undefined } });
        if (input.isActive) await tx.maturityModel.updateMany({ where: { orgId: ctx.orgId, name: input.name ?? m.name, id: { not: id } }, data: { isActive: false } });
      }
      if (input.weights) {
        for (const w of input.weights) {
          await tx.dimension.updateMany({ where: { modelId: id, code: w.code }, data: { weight: w.weight } });
        }
      }
      await tx.auditLog.create({ data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "MaturityModel", entityId: id, action: "update", after: input as any } });
      return { ok: true as const };
    });

    if ((out as any).locked) return conflict("El modelo ya tiene assessments. Clónalo (POST /api/models con cloneFrom) y edita la nueva versión.");
    if ((out as any).global) return conflict("El modelo global no se edita. Clónalo a tu organización primero.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
