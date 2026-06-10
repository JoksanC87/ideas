import { computeScore, findDiscrepancies, levelOf, type Responses, type ScoringModel } from "./scoring";

export interface AiDimSuggestion {
  code: string; declaredScore: number; suggestedScore: number; confidence: number;
  evidenceQuality: number; rationale: string;
}
export interface AiEvaluation {
  generatedAt: string; source: "ai" | "heuristic"; overallConfidence: number;
  perDimension: AiDimSuggestion[]; risks: string[]; narrative: string; requiresHumanReview: true;
}

export interface EvidenceItem { code: string; type: string; qualityScore?: number | null; url?: string | null; summary?: string | null }

/** Calidad de evidencia promedio por dimensión (0..1). */
function qualityByDim(model: ScoringModel, evidence: EvidenceItem[]): Record<string, number> {
  const codeToDim = new Map(model.questions.map((q) => [q.code, q.dimension]));
  const acc: Record<string, { sum: number; n: number }> = {};
  for (const e of evidence) {
    const dim = codeToDim.get(e.code);
    if (!dim || e.qualityScore == null) continue;
    acc[dim] ??= { sum: 0, n: 0 };
    acc[dim].sum += e.qualityScore; acc[dim].n += 1;
  }
  const out: Record<string, number> = {};
  for (const [dim, v] of Object.entries(acc)) out[dim] = v.n ? v.sum / v.n / 100 : 0;
  return out;
}

function heuristic(model: ScoringModel, responses: Responses, evidence: EvidenceItem[]): AiEvaluation {
  const result = computeScore(responses, model);
  const qByDim = qualityByDim(model, evidence);
  const disc = findDiscrepancies(responses, model).length;

  const perDimension: AiDimSuggestion[] = model.dimensions.map((d) => {
    const r = result.dims[d.code];
    const declared = r.score;
    const q = qByDim[d.code] ?? 0;
    // evidencia efectiva = mejor de cobertura declarada o calidad real de evidencia
    const eff = Math.max(r.evRate, q * 0.85);
    const penalty = Math.round((1 - eff) * Math.min(declared, 25));
    const suggested = Math.max(0, declared - penalty);
    const confidence = Math.round((r.evRate * 0.5 + q * 0.5) * 100);
    return {
      code: d.code, declaredScore: declared, suggestedScore: suggested, confidence,
      evidenceQuality: Math.round(q * 100),
      rationale: q > 0
        ? `Evidencia con calidad ${Math.round(q * 100)}/100; score sugerido ${suggested}.`
        : `Sin evidencia analizada; se sugiere ${suggested} hasta validar.`,
    };
  });

  const risks = model.dimensions.filter((d) => result.dims[d.code].score < 45)
    .map((d) => `${d.short ?? d.code}: nivel bajo (${result.dims[d.code].score}/100).`);
  if (disc > 0) risks.unshift(`${disc} respuesta(s) con score alto sin evidencia: requieren revisión.`);

  return {
    generatedAt: new Date().toISOString(), source: "heuristic",
    overallConfidence: result.confScore, perDimension, risks,
    narrative: `Madurez global ${result.global}/100 (${levelOf(result.global)}). La calidad de evidencia ajusta la confianza por dimensión; validar las de menor calidad antes de cerrar.`,
    requiresHumanReview: true,
  };
}

export async function evaluateAssessment(
  model: ScoringModel, responses: Responses, evidence: EvidenceItem[] = []
): Promise<AiEvaluation> {
  if (!process.env.ANTHROPIC_API_KEY) return heuristic(model, responses, evidence);
  try {
    const result = computeScore(responses, model);
    const qByDim = qualityByDim(model, evidence);
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const context = {
      global: result.global,
      dimensions: model.dimensions.map((d) => ({
        code: d.code, short: d.short, score: result.dims[d.code].score,
        evidenceRate: Math.round(result.dims[d.code].evRate * 100),
        evidenceQuality: Math.round((qByDim[d.code] ?? 0) * 100),
      })),
      discrepancies: findDiscrepancies(responses, model).map((q) => q.code),
      evidence: evidence.map((e) => ({ code: e.code, type: e.type, quality: e.qualityScore, summary: e.summary })),
    };
    const msg = await client.messages.create({
      model: process.env.AI_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: 1600,
      system:
        "Eres un auditor experto de Design Systems. Pondera la CALIDAD de evidencia: score alto sin evidencia de calidad debe bajar. " +
        "Devuelve SOLO JSON: {\"perDimension\":[{\"code\":string,\"suggestedScore\":number,\"confidence\":number,\"rationale\":string}],\"risks\":string[],\"narrative\":string}. Español.",
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const perDimension: AiDimSuggestion[] = model.dimensions.map((d) => {
      const ai = (parsed.perDimension ?? []).find((x: any) => x.code === d.code);
      const declared = result.dims[d.code].score;
      return {
        code: d.code, declaredScore: declared,
        suggestedScore: ai ? Math.round(ai.suggestedScore) : declared,
        confidence: ai ? Math.round(ai.confidence) : Math.round(result.dims[d.code].evRate * 100),
        evidenceQuality: Math.round((qByDim[d.code] ?? 0) * 100),
        rationale: ai?.rationale ?? "",
      };
    });
    return {
      generatedAt: new Date().toISOString(), source: "ai", overallConfidence: result.confScore,
      perDimension, risks: Array.isArray(parsed.risks) ? parsed.risks : [], narrative: parsed.narrative ?? "",
      requiresHumanReview: true,
    };
  } catch {
    return heuristic(model, responses, evidence);
  }
}
