import { NextRequest, NextResponse } from "next/server";
import { getContext, can, unauthorized, forbidden } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { loadScoringModel } from "@/lib/model-loader";
import { rowToAnswer } from "@/lib/answers";
import { evaluateAssessment } from "@/lib/ai-evaluator";
import type { Responses } from "@/lib/scoring";

/** Corre la evaluación AI (sugerencias + riesgos + narrativa) y deja el assessment IN_REVIEW. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "recompute")) return forbidden();
  const { id } = await params;

  const out = await withTenant(ctx.orgId, async (tx) => {
    const a = await tx.assessment.findUniqueOrThrow({
      where: { id },
      include: {
        responses: { include: { question: true, evidence: { select: { id: true, type: true, url: true, aiSummary: true } } } },
      },
    });
    const model = await loadScoringModel(tx, a.modelId);
    const byCode = new Map(model.questions.map((q) => [q.code, q]));

    const responses: Responses = {};
    const evidence: { code: string; type: string; url?: string | null; summary?: string | null }[] = [];
    for (const r of a.responses) {
      const q = byCode.get(r.question.code);
      if (!q) continue;
      responses[q.code] = rowToAnswer(q, { valueNumber: r.valueNumber, valueBool: r.valueBool, valueText: r.valueText, valueList: r.valueList }, r.evidence.length > 0);
      r.evidence.forEach((e) => evidence.push({ code: r.question.code, type: e.type, url: e.url, summary: e.aiSummary }));
    }

    const evaluation = await evaluateAssessment(model, responses, evidence);
    await tx.assessment.update({
      where: { id },
      data: { aiEvaluation: evaluation as any, aiEvaluatedAt: new Date(), status: "IN_REVIEW" },
    });
    await tx.auditLog.create({ data: { orgId: ctx.orgId, actorId: ctx.userId, entity: "Assessment", entityId: id, action: "ai_evaluate", after: { source: evaluation.source, confidence: evaluation.overallConfidence } } });
    return evaluation;
  });

  return NextResponse.json({ evaluation: out });
}
