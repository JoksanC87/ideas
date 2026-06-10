/**
 * Scoring engine model-driven. El modelo (dimensiones + preguntas) se pasa como
 * argumento, así que funciona tanto con el modelo estático v1 como con modelos
 * editados por cliente desde el assessment builder.
 */
import {
  QUESTIONS, DIMENSIONS,
  type QType, type Option, type NumberConfig, type Condition,
} from "../data/questions";

export interface Answer {
  value?: number | boolean | string | string[] | null;
  evidence?: boolean;
  connected?: boolean;
  comment?: string;
  uncertain?: boolean;
  validated?: boolean;
}
export type Responses = Record<string, Answer>;

/** Forma mínima de pregunta que el engine necesita (DB o estática). */
export interface SQuestion {
  code: string;
  dimension: string;
  type: QType;
  weight: number;
  critical: boolean;
  options?: Option[];
  number?: NumberConfig;
  condition?: Condition;
}
export interface ScoringModel {
  dimensions: { code: string; short?: string; weight: number }[];
  questions: SQuestion[];
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function normalize(
  q: Pick<SQuestion, "type" | "options" | "number">,
  a?: Answer
): number | null {
  if (!a) return null;
  const v = a.value;
  switch (q.type) {
    case "scale": return v == null ? null : clamp((Number(v) / 5) * 100);
    case "boolean": return v == null ? null : v ? 100 : 0;
    case "single": {
      if (!q.options || v == null) return null;
      const opt = q.options.find((o) => o.label === v);
      return opt ? clamp(opt.score) : null;
    }
    case "multi": {
      if (!q.options || !Array.isArray(v)) return null;
      const total = q.options.reduce((s, o) => s + o.score, 0) || 1;
      const got = q.options.filter((o) => (v as string[]).includes(o.label)).reduce((s, o) => s + o.score, 0);
      return clamp((got / total) * 100);
    }
    case "number": {
      if (v == null || isNaN(Number(v))) return null;
      const n = Number(v); const cfg = q.number;
      if (!cfg) return clamp(n);
      if (cfg.bands) { const band = cfg.bands.find((b) => n <= b.upTo); return band ? clamp(band.score) : 0; }
      const base = clamp(n);
      return cfg.inverse ? clamp(100 - base) : base;
    }
    case "integration": return a.connected ? 100 : v ? 100 : 0;
    case "url":
    case "upload": return a.evidence || (typeof v === "string" && v.length > 0) ? 100 : 0;
    case "open": return null;
    default: return null;
  }
}

export function isActive(q: SQuestion, responses: Responses): boolean {
  if (!q.condition) return true;
  const dep = responses[q.condition.questionCode];
  return !!dep && dep.value === q.condition.equals;
}

export interface DimResult {
  code: string; score: number; coverage: number; evRate: number;
  answered: number; total: number; critMissing: number; pendingReview: number;
}
export interface ScoreResult {
  global: number; level: string; levelShort: string;
  dims: Record<string, DimResult>;
  confidence: "Alto" | "Medio" | "Bajo"; confScore: number;
  evRate: number; coverage: number;
}

export const levelOf = (s: number) =>
  s < 21 ? "Inexistente / Fragmentado" : s < 41 ? "Inicial" : s < 61 ? "En construcción" :
  s < 76 ? "Operativo" : s < 91 ? "Escalable" : "Optimizado / Inteligente";
export const levelShortOf = (s: number) =>
  s < 21 ? "Fragmentado" : s < 41 ? "Inicial" : s < 61 ? "En construcción" :
  s < 76 ? "Operativo" : s < 91 ? "Escalable" : "Optimizado";

function scoreDimension(code: string, model: ScoringModel, responses: Responses): DimResult {
  const qs = model.questions.filter((q) => q.dimension === code && isActive(q, responses));
  let wsum = 0, w = 0, answered = 0, withEv = 0, critMissing = 0, pendingReview = 0;
  for (const q of qs) {
    const a = responses[q.code];
    const norm = normalize(q, a);
    if (norm === null) { if (q.type === "open" && a && a.value) pendingReview++; continue; }
    answered++;
    const hasEv = !!(a?.evidence || a?.connected);
    if (hasEv) withEv++;
    let score = norm;
    if (q.critical && !hasEv && norm >= 60) { score *= 0.8; critMissing++; }
    wsum += score * q.weight; w += q.weight;
  }
  return {
    code, score: w > 0 ? Math.round(wsum / w) : 0,
    coverage: qs.length ? answered / qs.length : 0,
    evRate: answered ? withEv / answered : 0,
    answered, total: qs.length, critMissing, pendingReview,
  };
}

export function computeScore(responses: Responses, model: ScoringModel): ScoreResult {
  const dims: Record<string, DimResult> = {};
  let wAcc = 0, wTot = 0, totEv = 0, totAns = 0;
  for (const d of model.dimensions) {
    const r = scoreDimension(d.code, model, responses);
    dims[d.code] = r;
    wAcc += r.score * d.weight; wTot += d.weight;
    totEv += r.evRate * r.answered; totAns += r.answered;
  }
  const g = wTot > 0 ? Math.round(wAcc / wTot) : 0; // robusto a pesos que no sumen 1
  const evRate = totAns ? totEv / totAns : 0;
  const coverage = model.dimensions.length
    ? model.dimensions.reduce((s, d) => s + dims[d.code].coverage, 0) / model.dimensions.length : 0;
  const confScore = Math.round((evRate * 0.6 + coverage * 0.4) * 100);
  const confidence = confScore >= 70 ? "Alto" : confScore >= 45 ? "Medio" : "Bajo";
  return { global: g, level: levelOf(g), levelShort: levelShortOf(g), dims, confidence, confScore, evRate, coverage };
}

export function findDiscrepancies(responses: Responses, model: ScoringModel): SQuestion[] {
  return model.questions.filter((q) => {
    if (q.type === "open") return false;
    const a = responses[q.code];
    const norm = normalize(q, a);
    const hasEv = !!(a?.evidence || a?.connected);
    return norm !== null && norm >= 75 && !hasEv;
  });
}

/** Modelo estático v1 (para modo local del cliente y fallbacks). */
export function staticScoringModel(): ScoringModel {
  return {
    dimensions: DIMENSIONS.map((d) => ({ code: d.id, short: d.short, weight: d.weight })),
    questions: QUESTIONS.map((q) => ({
      code: q.code, dimension: q.dimension, type: q.type, weight: q.weight,
      critical: q.critical, options: q.options, number: q.number, condition: q.condition,
    })),
  };
}
