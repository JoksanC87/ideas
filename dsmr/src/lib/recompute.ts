import type { Prisma } from "@prisma/client";
import { rowToAnswer } from "./answers";
import { computeScore, type Responses } from "./scoring";
import { loadScoringModel } from "./model-loader";
import { buildRecommendations } from "./recommendations";

/**
 * Recalcula los scores de un assessment usando el MODELO del assessment
 * (no el banco estático), persiste un snapshot histórico (Score GLOBAL +
 * por dimensión) y regenera las recomendaciones. Correr dentro de withTenant().
 */
export async function recompute(tx: Prisma.TransactionClient, assessmentId: string) {
  const assessment = await tx.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { responses: { include: { question: true, evidence: { select: { id: true } } } } },
  });

  const model = await loadScoringModel(tx, assessment.modelId);
  const byCode = new Map(model.questions.map((q) => [q.code, q]));

  const responses: Responses = {};
  for (const r of assessment.responses) {
    const q = byCode.get(r.question.code);
    if (!q) continue;
    responses[q.code] = rowToAnswer(
      q,
      { valueNumber: r.valueNumber, valueBool: r.valueBool, valueText: r.valueText, valueList: r.valueList },
      r.evidence.length > 0
    );
  }

  const result = computeScore(responses, model);
  const computedAt = new Date();
  const orgId = assessment.orgId;

  await tx.score.createMany({
    data: [
      { orgId, assessmentId, scope: "GLOBAL", dimensionCode: null, raw: result.global, validated: result.global, confidence: result.confScore, computedAt },
      ...model.dimensions.map((d) => ({
        orgId, assessmentId, scope: "DIMENSION" as const, dimensionCode: d.code,
        raw: result.dims[d.code].score, validated: result.dims[d.code].score,
        confidence: Math.round(result.dims[d.code].evRate * 100), computedAt,
      })),
    ],
  });

  const recos = buildRecommendations(result, model);
  await tx.recommendation.deleteMany({ where: { assessmentId } });
  if (recos.length) {
    await tx.recommendation.createMany({
      data: recos.map((r) => ({ orgId, assessmentId, dimensionCode: r.dimensionCode, bucket: r.bucket, title: r.title, items: r.items, impact: r.impact, effort: r.effort })),
    });
  }

  return { result, recommendations: recos, model };
}

export async function latestScores(tx: Prisma.TransactionClient, assessmentId: string) {
  const rows = await tx.score.findMany({ where: { assessmentId }, orderBy: { computedAt: "desc" } });
  const seen = new Set<string>();
  const latest = rows.filter((r) => {
    const k = `${r.scope}:${r.dimensionCode ?? ""}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  const global = latest.find((r) => r.scope === "GLOBAL");
  const dims = Object.fromEntries(latest.filter((r) => r.scope === "DIMENSION").map((r) => [r.dimensionCode, r.raw])) as Record<string, number>;
  return { global: global?.raw ?? 0, confidence: global?.confidence ?? 0, dims };
}
