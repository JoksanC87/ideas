import { NextRequest, NextResponse } from "next/server";
import { getContext, can, unauthorized, forbidden } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { latestScores } from "@/lib/recompute";
import { loadScoringModel } from "@/lib/model-loader";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "assessment:read")) return forbidden();
  const { id } = await params;

  const data = await withTenant(ctx.orgId, async (tx) => {
    const a = await tx.assessment.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        responses: { include: { question: true, evidence: { select: { id: true, url: true } } } },
        recommendations: { orderBy: { impact: "desc" } },
      },
    });

    const model = await loadScoringModel(tx, a.modelId);
    const byCode = new Map(model.questions.map((q) => [q.code, q]));

    const responses: Record<string, any> = {};
    for (const r of a.responses) {
      const q = byCode.get(r.question.code);
      if (!q) continue;
      let value: any = null;
      if (q.type === "scale" || q.type === "number") value = r.valueNumber;
      else if (q.type === "boolean" || q.type === "integration") value = r.valueBool;
      else if (q.type === "multi") value = r.valueList;
      else value = r.valueText;
      responses[r.question.code] = {
        value,
        evidence: r.evidence.length > 0,
        connected: q.type === "integration" ? !!r.valueBool : undefined,
        evidenceUrl: r.evidence[0]?.url ?? "",
        comment: r.comment ?? "",
        uncertain: r.uncertain,
        validationStatus: r.validationStatus,
      };
    }

    const scores = await latestScores(tx, id);
    return {
      assessment: { id: a.id, title: a.title, status: a.status, company: a.company },
      responses, scores, recommendations: a.recommendations,
    };
  });

  return NextResponse.json(data);
}
