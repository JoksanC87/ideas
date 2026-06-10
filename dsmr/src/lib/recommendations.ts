import type { ScoreResult, ScoringModel } from "./scoring";

/** Umbral por defecto y overrides para el modelo v1 (A–J). */
const DEFAULT_THRESHOLD = 55;
export const THRESHOLDS: Record<string, number> = {
  A: 56, B: 60, C: 60, D: 56, E: 58, F: 60, G: 56, H: 56, I: 50, J: 50,
};
export const thresholdFor = (code: string) => THRESHOLDS[code] ?? DEFAULT_THRESHOLD;

const ITEMS: Record<string, { title: string; items: string[] }> = {
  A: { title: "Estrategia", items: ["Articular la visión del DS como producto interno.", "Conectar a OKRs y asegurar sponsorship ejecutivo.", "Definir métricas de impacto y roadmap estratégico."] },
  B: { title: "Gobernanza", items: ["Definir modelo RACI y comité de decisión.", "Formalizar intake y modelo de contribución con SLAs.", "Rituales de revisión y ownership compartido."] },
  C: { title: "Adopción", items: ["Medir uso real en Figma y código; detectar detached.", "Programa de enablement para células con baja adopción.", "Office hours y plan de migración desde legacy."] },
  D: { title: "Tokenización", items: ["Arquitectura de tokens en 3 niveles.", "Naming convention y pipeline Figma → tokens → código.", "Validar contraste y pruebas automáticas de tokens."] },
  E: { title: "Componentes", items: ["Paridad Figma-código y versionamiento semántico.", "Documentar patrones de formularios, tablas y flujos.", "Criterios de deprecación y roadmap de migración."] },
  F: { title: "Documentación", items: ["Portal centralizado con guidelines y do's & don'ts.", "Documentación para diseño, dev y producto.", "Medir consumo y cerrar feedback loop."] },
  G: { title: "Testing y calidad", items: ["Unit, visual regression y accessibility tests.", "Quality gates en CI/CD y checklist de release.", "Cobertura mínima por componente crítico."] },
  H: { title: "Métricas", items: ["Dashboard de adopción por diseño y desarrollo.", "Medir detach, deuda y health score; comparar histórico.", "Medir % con testing y documentados."] },
  I: { title: "Integración / AI", items: ["Integrar el DS al delivery (discovery → release).", "Conectar Figma, Storybook, repos y trackers.", "Automatización de tokens/docs y AI supervisada."] },
  J: { title: "Sostenibilidad", items: ["Asignar capacidad/presupuesto y responsables.", "Roadmap vivo, cadencia de releases y control de deuda.", "Monitorear salud y capacidad de escalar."] },
};
const GENERIC = (short?: string) => ({
  title: short ?? "Dimensión",
  items: ["Definir prácticas formales y responsables.", "Documentar y medir adopción.", "Cerrar brechas de evidencia y validación."],
});

export type RecoBucket = "QUICK_WIN" | "TACTICAL" | "STRATEGIC";
export interface RecoRow {
  dimensionCode: string; bucket: RecoBucket; title: string;
  items: string[]; impact: number; effort: number;
}

export function buildRecommendations(result: ScoreResult, model: ScoringModel): RecoRow[] {
  const wTot = model.dimensions.reduce((s, d) => s + d.weight, 0) || 1;
  const out: RecoRow[] = [];
  for (const d of model.dimensions) {
    const score = result.dims[d.code]?.score ?? 0;
    if (score >= thresholdFor(d.code)) continue;
    const impact = Math.round((d.weight / wTot) * (100 - score) * 1000) / 10; // 0..~14
    const effort = score < 30 ? 80 : score < 45 ? 60 : 40;
    const bucket: RecoBucket = impact > 5 && effort <= 45 ? "QUICK_WIN" : impact > 5 ? "STRATEGIC" : "TACTICAL";
    const tpl = ITEMS[d.code] ?? GENERIC(d.short);
    out.push({ dimensionCode: d.code, bucket, title: tpl.title, items: tpl.items, impact, effort });
  }
  return out.sort((a, b) => b.impact - a.impact);
}
