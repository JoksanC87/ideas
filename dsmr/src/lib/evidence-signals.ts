/**
 * Extracción de señales y qualityScore de una evidencia.
 * Determinista (sin red obligatoria); si hay contenido de tokens, lo parsea.
 * El resultado alimenta al AI evaluator y al Evidence hub.
 */
export type EvidenceKind =
  | "FIGMA" | "TOKENS_FILE" | "STORYBOOK" | "REPO" | "DOCS"
  | "TRACKER" | "DASHBOARD" | "A11Y_REPORT" | "TEST_RESULT" | "SURVEY" | "OTHER";

export interface Signal { key: string; value: string | number | boolean }
export interface AnalysisResult { kind: EvidenceKind; qualityScore: number; signals: Signal[]; summary: string }

const DOMAIN_RULES: { re: RegExp; kind: EvidenceKind; base: number }[] = [
  { re: /figma\.com/i, kind: "FIGMA", base: 70 },
  { re: /(github|gitlab|bitbucket)\.(com|org)/i, kind: "REPO", base: 75 },
  { re: /(storybook|chromatic)\./i, kind: "STORYBOOK", base: 80 },
  { re: /(zeroheight|notion\.so|confluence|gitbook)\./i, kind: "DOCS", base: 65 },
  { re: /(jira|linear\.app|dev\.azure)/i, kind: "TRACKER", base: 55 },
  { re: /(datadog|grafana|looker|metabase|amplitude)\./i, kind: "DASHBOARD", base: 70 },
];
const EXT_RULES: { re: RegExp; kind: EvidenceKind; base: number }[] = [
  { re: /\.(json|css|scss|tokens)$/i, kind: "TOKENS_FILE", base: 70 },
  { re: /\.(png|jpg|jpeg|pdf)$/i, kind: "OTHER", base: 45 },
  { re: /(a11y|axe|wcag).*\.(json|html|csv)$/i, kind: "A11Y_REPORT", base: 75 },
  { re: /(junit|coverage|test).*\.(xml|json|html)$/i, kind: "TEST_RESULT", base: 75 },
];

function detect(url?: string | null, filename?: string | null, declared?: EvidenceKind): { kind: EvidenceKind; base: number } {
  if (url) { const r = DOMAIN_RULES.find((x) => x.re.test(url)); if (r) return { kind: r.kind, base: r.base }; }
  if (filename) { const r = EXT_RULES.find((x) => x.re.test(filename)); if (r) return { kind: r.kind, base: r.base }; }
  return { kind: declared ?? "OTHER", base: 40 };
}

/** Parsea un archivo de tokens (JSON) y detecta arquitectura de niveles. */
function parseTokens(content: string): { signals: Signal[]; bonus: number } {
  try {
    const json = JSON.parse(content);
    const keys: string[] = [];
    const walk = (o: any, path: string) => {
      if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
      else keys.push(path);
    };
    walk(json, "");
    const has = (re: RegExp) => keys.some((k) => re.test(k));
    const primitive = has(/(color|space|font|size)\.(\d|gray|blue|red|base)/i) || has(/^(palette|primitive|ref)\./i);
    const semantic = has(/(semantic|system)\./i) || has(/(bg|text|border|surface|action)\./i);
    const component = has(/(button|input|card|modal|table)\./i) || has(/component\./i);
    const tiers = [primitive, semantic, component].filter(Boolean).length;
    const signals: Signal[] = [
      { key: "tokenCount", value: keys.length },
      { key: "hasPrimitive", value: primitive },
      { key: "hasSemantic", value: semantic },
      { key: "hasComponent", value: component },
      { key: "tierLevels", value: tiers },
    ];
    const bonus = tiers >= 3 ? 25 : tiers === 2 ? 12 : 0;
    return { signals, bonus };
  } catch {
    return { signals: [{ key: "parseError", value: true }], bonus: -10 };
  }
}

export function analyzeEvidence(input: {
  url?: string | null; filename?: string | null; title?: string | null;
  declaredType?: EvidenceKind; content?: string | null; sizeBytes?: number;
}): AnalysisResult {
  const { kind, base } = detect(input.url, input.filename, input.declaredType);
  const signals: Signal[] = [{ key: "source", value: input.url ? "url" : "file" }];
  let score = base;

  if (input.title) { score += 5; signals.push({ key: "titled", value: true }); }
  if (input.url) signals.push({ key: "domain", value: (() => { try { return new URL(input.url).hostname; } catch { return "n/a"; } })() });
  if (typeof input.sizeBytes === "number") signals.push({ key: "sizeBytes", value: input.sizeBytes });

  if (kind === "TOKENS_FILE" && input.content) {
    const t = parseTokens(input.content);
    signals.push(...t.signals);
    score += t.bonus;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const summary =
    kind === "TOKENS_FILE"
      ? `Archivo de tokens (${signals.find((s) => s.key === "tierLevels")?.value ?? 0} niveles detectados, ${signals.find((s) => s.key === "tokenCount")?.value ?? 0} tokens).`
      : `Evidencia tipo ${kind}${input.url ? ` (${signals.find((s) => s.key === "domain")?.value})` : ""}. Calidad estimada ${score}/100.`;

  return { kind, qualityScore: score, signals, summary };
}
