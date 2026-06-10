import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest, conflict } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { questionCreateSchema } from "@/lib/schemas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:write")) return forbidden();
  const { id: modelId } = await params;

  try {
    const input = questionCreateSchema.parse(await req.json());
    const out = await withTenant(ctx.orgId, async (tx) => {
      const m = await tx.maturityModel.findUniqueOrThrow({ where: { id: modelId }, include: { _count: { select: { assessments: true } }, dimensions: true } });
      if (m._count.assessments > 0) return { locked: true as const };
      const dim = m.dimensions.find((d) => d.code === input.dimensionCode);
      if (!dim) return { noDim: true as const };

      const count = await tx.question.count({ where: { modelId, dimensionId: dim.id } });
      const code = `${dim.code}${count + 1}`;
      const q = await tx.question.create({
        data: {
          modelId, dimensionId: dim.id, code, subdimension: input.subdimension ?? dim.short,
          text: input.text, type: input.type, weight: input.weight, role: input.role,
          critical: input.critical, evidenceRequired: input.evidenceRequired, recommendationKey: dim.code,
          options: input.options ?? undefined, number: input.number ?? undefined, condition: input.condition ?? undefined,
          order: count,
        },
      });
      return { ok: true as const, q };
    });
    if ((out as any).locked) return conflict("Modelo con assessments: clónalo antes de editar.");
    if ((out as any).noDim) return badRequest("Dimensión no encontrada en el modelo.");
    return NextResponse.json({ question: (out as any).q }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
