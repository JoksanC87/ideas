import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { upsertResponsesSchema } from "@/lib/schemas";
import { toColumns, scoreOf } from "@/lib/answers";
import { loadScoringModel } from "@/lib/model-loader";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "response:write")) return forbidden();
  const { id: assessmentId } = await params;

  try {
    const input = upsertResponsesSchema.parse(await req.json());
    await withTenant(ctx.orgId, async (tx) => {
      const a = await tx.assessment.findUniqueOrThrow({
        where: { id: assessmentId }, select: { modelId: true },
      });

      const model = await loadScoringModel(tx, a.modelId);
      const byCode = new Map(model.questions.map((q) => [q.code, q]));

      for (const item of input.responses) {
        const q = byCode.get(item.questionCode);
        if (!q) continue;
        const question = await tx.question.findUniqueOrThrow({
          where: { modelId_code: { modelId: a.modelId, code: item.questionCode } }, select: { id: true },
        });

        const cols = toColumns(q, item);
        const hasEvidence = !!item.evidence || !!item.evidenceUrl;
        const norm = scoreOf(q, item);
        const validationStatus =
          norm !== null && norm >= 75 && !hasEvidence && q.type !== "open"
            ? "DISCREPANCY"
            : "PENDING";

        const response = await tx.response.upsert({
          where: { assessmentId_questionId: { assessmentId, questionId: question.id } },
          create: {
            orgId: ctx.orgId, assessmentId, questionId: question.id,
            ...cols, normalizedScore: norm, comment: item.comment, uncertain: item.uncertain ?? false,
            validationStatus, answeredById: ctx.userId,
          },
          update: {
            ...cols, normalizedScore: norm, comment: item.comment, uncertain: item.uncertain ?? false,
            validationStatus, answeredById: ctx.userId,
          },
        });

        if (item.evidenceUrl) {
          const existing = await tx.evidence.findFirst({ where: { responseId: response.id } });
          if (existing) {
            await tx.evidence.update({ where: { id: existing.id }, data: { url: item.evidenceUrl } });
          } else {
            await tx.evidence.create({
              data: { orgId: ctx.orgId, assessmentId, responseId: response.id, type: "OTHER", url: item.evidenceUrl },
            });
          }
        } else if (item.evidence === false) {
          await tx.evidence.deleteMany({ where: { responseId: response.id } });
        }
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
