import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { createAssessmentSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "assessment:read")) return forbidden();

  const companyId = req.nextUrl.searchParams.get("companyId") ?? undefined;
  const list = await withTenant(ctx.orgId, (tx) =>
    tx.assessment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } })
  );
  return NextResponse.json({ assessments: list });
}

export async function POST(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "assessment:write")) return forbidden();

  try {
    const input = createAssessmentSchema.parse(await req.json());
    const created = await withTenant(ctx.orgId, async (tx) => {
      const model = input.modelId
        ? await tx.maturityModel.findUniqueOrThrow({ where: { id: input.modelId } })
        : await tx.maturityModel.findFirstOrThrow({ where: { isActive: true }, orderBy: { version: "desc" } });

      const assessment = await tx.assessment.create({
        data: {
          orgId: ctx.orgId, companyId: input.companyId, scopeId: input.scopeId,
          modelId: model.id, title: input.title ?? "Nuevo diagnóstico",
          status: "IN_PROGRESS", createdById: ctx.userId,
        },
      });

      // Duplicar respuestas de un assessment previo (nueva evaluación comparable)
      if (input.duplicateFrom) {
        const prev = await tx.response.findMany({ where: { assessmentId: input.duplicateFrom } });
        if (prev.length) {
          await tx.response.createMany({
            data: prev.map((r) => ({
              orgId: ctx.orgId, assessmentId: assessment.id, questionId: r.questionId,
              valueNumber: r.valueNumber, valueBool: r.valueBool, valueText: r.valueText,
              valueList: r.valueList, normalizedScore: r.normalizedScore,
            })),
          });
        }
      }
      return assessment;
    });
    return NextResponse.json({ assessment: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
