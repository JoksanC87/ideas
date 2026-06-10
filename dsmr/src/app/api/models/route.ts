import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { createModelSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:read")) return forbidden();

  const models = await withTenant(ctx.orgId, (tx) =>
    tx.maturityModel.findMany({
      where: { OR: [{ orgId: ctx.orgId }, { orgId: null }] },
      include: { _count: { select: { questions: true, dimensions: true, assessments: true } } },
      orderBy: [{ name: "asc" }, { version: "desc" }],
    })
  );
  return NextResponse.json({ models });
}

export async function POST(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "model:write")) return forbidden();

  try {
    const input = createModelSchema.parse(await req.json());
    const created = await withTenant(ctx.orgId, async (tx) => {
      const last = await tx.maturityModel.findFirst({ where: { orgId: ctx.orgId, name: input.name }, orderBy: { version: "desc" } });
      const version = (last?.version ?? 0) + 1;

      const model = await tx.maturityModel.create({
        data: {
          orgId: ctx.orgId, name: input.name, version, isActive: input.setActive ?? false,
          levelBands: input.cloneFrom
            ? (((await tx.maturityModel.findUniqueOrThrow({ where: { id: input.cloneFrom } })).levelBands ?? []) as any)
            : ([] as any),
        },
      });

      if (input.cloneFrom) {
        const src = await tx.maturityModel.findUniqueOrThrow({
          where: { id: input.cloneFrom },
          include: { dimensions: true, questions: { include: { dimension: { select: { code: true } } } } },
        });
        // copiar dimensiones y mapear code → nuevo id
        const dimIdByCode: Record<string, string> = {};
        for (const d of src.dimensions) {
          const nd = await tx.dimension.create({ data: { modelId: model.id, code: d.code, name: d.name, short: d.short, weight: d.weight, order: d.order } });
          dimIdByCode[d.code] = nd.id;
        }
        if (src.questions.length) {
          await tx.question.createMany({
            data: src.questions.map((q) => ({
              modelId: model.id, dimensionId: dimIdByCode[q.dimension.code], code: q.code, subdimension: q.subdimension,
              text: q.text, type: q.type, weight: q.weight, role: q.role, critical: q.critical,
              evidenceRequired: q.evidenceRequired, expectedLevel: q.expectedLevel, riskIfMissing: q.riskIfMissing,
              recommendationKey: q.recommendationKey, options: q.options ?? undefined, number: q.number ?? undefined,
              condition: q.condition ?? undefined, order: q.order,
            })),
          });
        }
      }

      if (input.setActive) {
        await tx.maturityModel.updateMany({ where: { orgId: ctx.orgId, name: input.name, id: { not: model.id } }, data: { isActive: false } });
      }
      await tx.auditLog.create({ data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "MaturityModel", entityId: model.id, action: "create", after: { name: model.name, version, clonedFrom: input.cloneFrom ?? null } } });
      return model;
    });
    return NextResponse.json({ model: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
