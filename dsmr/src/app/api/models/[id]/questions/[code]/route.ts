import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest, conflict } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { questionUpdateSchema } from "@/lib/schemas";

async function guard(tx: any, modelId: string) {
  const m = await tx.maturityModel.findUniqueOrThrow({ where: { id: modelId }, include: { _count: { select: { assessments: true } } } });
  return m._count.assessments === 0;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; code: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:write")) return forbidden();
  const { id: modelId, code } = await params;

  try {
    const input = questionUpdateSchema.parse(await req.json());
    const out = await withTenant(ctx.orgId, async (tx) => {
      if (!(await guard(tx, modelId))) return { locked: true as const };
      await tx.question.update({
        where: { modelId_code: { modelId, code } },
        data: {
          text: input.text, type: input.type, weight: input.weight, role: input.role,
          critical: input.critical, evidenceRequired: input.evidenceRequired, subdimension: input.subdimension,
          options: input.options ?? undefined, number: input.number ?? undefined, condition: input.condition ?? undefined,
        },
      });
      return { ok: true as const };
    });
    if ((out as any).locked) return conflict("Modelo con assessments: clónalo antes de editar.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; code: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:write")) return forbidden();
  const { id: modelId, code } = await params;

  const out = await withTenant(ctx.orgId, async (tx) => {
    if (!(await guard(tx, modelId))) return { locked: true as const };
    await tx.question.delete({ where: { modelId_code: { modelId, code } } });
    return { ok: true as const };
  });
  if ((out as any).locked) return conflict("Modelo con assessments: clónalo antes de editar.");
  return NextResponse.json({ ok: true });
}
