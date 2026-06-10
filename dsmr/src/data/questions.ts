/**
 * Design System Maturity Radar — Banco de preguntas (Modelo v1)
 * 177 criterios del brief, con tipos de pregunta mixtos.
 * Framework-agnostic: lo consume el backend (seed Prisma) y el cliente.
 */

export type DimId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
export type Role = "product" | "lead" | "designops" | "designer" | "engineer";
export type QType =
  | "scale"        // 0–5
  | "boolean"      // sí / no
  | "single"       // opción múltiple (una)
  | "multi"        // selección múltiple
  | "number"       // numérico (% , días, score)
  | "open"         // campo abierto (cualitativo → revisión/AI)
  | "url"          // URL de evidencia
  | "upload"       // archivo de evidencia
  | "integration"; // dato traído automáticamente de una herramienta

export interface Option { label: string; score: number } // score normalizado 0–100
export interface NumberConfig {
  unit: string;
  identity?: boolean;             // score = valor (clamp 0–100)
  inverse?: boolean;             // score = 100 − valor (o banda invertida)
  bands?: { upTo: number; score: number }[]; // primera banda cuyo upTo ≥ valor
}
export interface Condition { questionCode: string; equals: string | number | boolean }

export interface Question {
  code: string;
  dimension: DimId;
  subdimension: string;
  text: string;
  type: QType;
  weight: number;          // peso relativo dentro de la dimensión
  role: Role;
  critical: boolean;       // penaliza score si se afirma sin evidencia
  evidenceRequired: boolean;
  expectedLevel: number;   // 0–5 esperado para una madurez sana
  riskIfMissing: string;
  recommendationKey: DimId;
  options?: Option[];      // para single / multi
  number?: NumberConfig;   // para number
  condition?: Condition;   // pregunta condicional
}

/* ---------------- Dimensiones y pesos (suman 100%) ---------------- */
export const DIMENSIONS: { id: DimId; name: string; short: string; weight: number; role: Role }[] = [
  { id: "A", short: "Estrategia",     name: "Estrategia, visión y alineación con negocio",       weight: 0.08, role: "product" },
  { id: "B", short: "Gobernanza",     name: "Gobernanza, operating model y equipo core",         weight: 0.10, role: "designops" },
  { id: "C", short: "Adopción",       name: "Adopción y uso real por equipos",                   weight: 0.12, role: "designer" },
  { id: "D", short: "Tokens",         name: "Foundations, tokenización y arquitectura semántica", weight: 0.14, role: "engineer" },
  { id: "E", short: "Componentes",    name: "Componentes, patrones y arquitectura técnica",      weight: 0.12, role: "engineer" },
  { id: "F", short: "Documentación",  name: "Documentación, enablement y experiencia de uso",    weight: 0.10, role: "designer" },
  { id: "G", short: "Calidad",        name: "Calidad, testing, accesibilidad y validación",      weight: 0.12, role: "engineer" },
  { id: "H", short: "Métricas",       name: "Métricas, observabilidad e impacto",                weight: 0.10, role: "designops" },
  { id: "I", short: "Integración/AI", name: "Integración con procesos, automatización y AI",     weight: 0.08, role: "designops" },
  { id: "J", short: "Sostenibilidad", name: "Mantenimiento, evolución y sostenibilidad",         weight: 0.04, role: "designops" },
];

/* ---------------- Sets reutilizables ---------------- */
const eq = (labels: string[]): Option[] => labels.map((l) => ({ label: l, score: 1 })); // multi: fracción seleccionada

const OPTIONS: Record<string, Option[]> = {
  SPONSORSHIP: [{ label: "Ninguno", score: 0 }, { label: "Informal", score: 45 }, { label: "Patrocinio activo", score: 100 }],
  GOV_MODEL: [{ label: "Ninguno", score: 0 }, { label: "Centralizado", score: 55 }, { label: "Federado", score: 85 }, { label: "Híbrido", score: 100 }],
  ADOPT_SCOPE: [{ label: "No medido", score: 0 }, { label: "Solo proyectos nuevos", score: 50 }, { label: "Nuevos + algunos existentes", score: 75 }, { label: "Transversal", score: 100 }],
  TOKEN_TIERS: [{ label: "Sin tokens", score: 0 }, { label: "Dos niveles", score: 55 }, { label: "Tres niveles (primitive/semantic/component)", score: 100 }],
  TOKEN_SCOPES: [{ label: "No definidos", score: 0 }, { label: "Solo globales", score: 45 }, { label: "Globales + semánticos", score: 75 }, { label: "Globales + semánticos + componente", score: 100 }],
  WCAG: [{ label: "Ninguno", score: 0 }, { label: "Nivel A", score: 40 }, { label: "Nivel AA", score: 80 }, { label: "Nivel AAA", score: 100 }],
  RELEASE_CADENCE: [{ label: "Ninguna", score: 0 }, { label: "Ad-hoc", score: 35 }, { label: "Regular", score: 75 }, { label: "Continua", score: 100 }],
  BUDGET: [{ label: "Sin capacidad", score: 0 }, { label: "Parcial", score: 55 }, { label: "Dedicada", score: 100 }],
  VALUE_DIMS: eq(["Eficiencia", "Consistencia", "Adopción", "Reducción de deuda", "Accesibilidad", "Velocidad", "Calidad"]),
  CORE_ROLES: eq(["DS Lead", "DesignOps", "Systems Designer", "Token Architect", "DS Engineer", "QA/A11y", "Adoption Lead"]),
  MULTIPLATFORM: eq(["Web", "iOS", "Android", "Flutter", "Angular", "React", "Otras"]),
  MULTIFRAMEWORK: eq(["React", "Angular", "Vue", "Web Components", "iOS", "Android", "Flutter"]),
  PATTERNS: eq(["Formularios", "Navegación", "Tablas", "Feedback", "Empty states", "Modales", "Cards", "Layouts", "Flujos críticos"]),
  A11Y_VALIDATION: eq(["Estados", "Errores", "Focus", "Teclado", "Screen readers", "Contraste"]),
  AI_FLOWS: eq(["Intake", "Priorización", "Documentación", "QA", "Release"]),
};
const NUMBERS: Record<string, NumberConfig> = {
  PCT: { unit: "%", identity: true },
  PCT_INV: { unit: "%", identity: true, inverse: true }, // detach, overrides, legacy… más alto = peor
  SATISFACTION: { unit: "0–100", identity: true },
  COVERAGE: { unit: "%", identity: true },
  DAYS_ADOPT: { unit: "días", inverse: true, bands: [{ upTo: 7, score: 100 }, { upTo: 30, score: 75 }, { upTo: 90, score: 45 }, { upTo: 180, score: 20 }, { upTo: 99999, score: 0 }] },
};

/* ---------------- DSL compacto ---------------- */
type Spec = {
  text: string;
  type?: QType;
  weight?: number;
  role?: Role;
  critical?: boolean;
  evidence?: boolean;
  expected?: number;
  optionSet?: keyof typeof OPTIONS;
  numberSet?: keyof typeof NUMBERS;
  condition?: Condition;
  sub?: string;
};
const s = (text: string, o: Omit<Spec, "text"> = {}): Spec => ({ text, ...o });

/* =====================================================================
   A. Estrategia (8%) — 7
   ===================================================================== */
const A: Spec[] = [
  s("Existe una visión clara y documentada del Design System", { type: "boolean", evidence: true, sub: "Visión" }),
  s("Está conectado a objetivos de negocio y OKRs", { type: "boolean", sub: "Alineación" }),
  s("Tiene métricas de impacto definidas", { type: "boolean", evidence: true, sub: "Impacto" }),
  s("Hay sponsorship ejecutivo", { type: "single", optionSet: "SPONSORSHIP", critical: true, sub: "Patrocinio" }),
  s("Se entiende como producto interno, no solo como librería visual", { type: "scale", sub: "Posicionamiento" }),
  s("Existe un roadmap estratégico", { type: "boolean", evidence: true, sub: "Roadmap" }),
  s("Se mide valor en eficiencia, consistencia, deuda, accesibilidad, velocidad y calidad", { type: "multi", optionSet: "VALUE_DIMS", sub: "Valor" }),
];

/* =====================================================================
   B. Gobernanza (10%) — 11
   ===================================================================== */
const B: Spec[] = [
  s("Existe un equipo core formal", { type: "boolean", critical: true, evidence: true, sub: "Equipo" }),
  s("Hay roles claros (Lead, DesignOps, Systems Designer, Token Architect, DS Engineer, QA/A11y, Adoption Lead)", { type: "multi", optionSet: "CORE_ROLES", evidence: true, sub: "Roles" }),
  s("Existe un modelo de contribución", { type: "boolean", critical: true, evidence: true, sub: "Contribución" }),
  s("Hay rituales de revisión", { type: "boolean", sub: "Rituales" }),
  s("Hay criterios para aceptar, rechazar o priorizar componentes", { type: "boolean", sub: "Decisión" }),
  s("Hay ownership compartido entre diseño y tecnología", { type: "scale", sub: "Ownership" }),
  s("Existen SLAs o tiempos de respuesta para solicitudes", { type: "boolean", evidence: true, sub: "SLAs" }),
  s("Hay proceso de intake desde áreas, células o stakeholders", { type: "boolean", evidence: true, sub: "Intake" }),
  s("Hay trazabilidad de decisiones", { type: "scale", sub: "Trazabilidad" }),
  s("Hay modelo federado o híbrido cuando aplica", { type: "single", optionSet: "GOV_MODEL", sub: "Operating model" }),
  s("Hay definición clara de responsabilidades entre core, contribution y consuming teams", { type: "boolean", sub: "RACI" }),
];

/* =====================================================================
   C. Adopción (12%) — 17
   ===================================================================== */
const C: Spec[] = [
  s("Porcentaje de diseñadores usando librerías oficiales", { type: "number", numberSet: "PCT", critical: true, evidence: true, role: "designer", sub: "Adopción diseño" }),
  s("Porcentaje de desarrolladores usando componentes oficiales", { type: "number", numberSet: "PCT", critical: true, evidence: true, role: "engineer", sub: "Adopción dev" }),
  s("Uso por célula, área, país o tribu", { type: "scale", sub: "Cobertura" }),
  s("Frecuencia de uso de componentes", { type: "scale", sub: "Frecuencia" }),
  s("Componentes más usados", { type: "open", sub: "Uso" }),
  s("Componentes menos usados", { type: "open", sub: "Uso" }),
  s("Nivel de detach en Figma", { type: "number", numberSet: "PCT_INV", sub: "Detach" }),
  s("Nivel de overrides no controlados", { type: "number", numberSet: "PCT_INV", sub: "Overrides" }),
  s("Duplicación de componentes", { type: "number", numberSet: "PCT_INV", sub: "Duplicación" }),
  s("Uso de librerías legacy", { type: "number", numberSet: "PCT_INV", sub: "Legacy" }),
  s("Fricción percibida por los equipos (5 = sin fricción)", { type: "scale", sub: "Fricción" }),
  s("Nivel de satisfacción de usuarios internos", { type: "number", numberSet: "SATISFACTION", evidence: true, sub: "Satisfacción" }),
  s("Adopción en proyectos nuevos vs productos existentes", { type: "single", optionSet: "ADOPT_SCOPE", sub: "Cobertura" }),
  s("Barreras culturales de adopción", { type: "open", sub: "Cultura" }),
  s("Tiempo promedio para adoptar nuevos componentes", { type: "number", numberSet: "DAYS_ADOPT", sub: "Time-to-adopt" }),
  s("Nivel de migración hacia librerías oficiales", { type: "number", numberSet: "PCT", sub: "Migración" }),
  s("Nivel de autonomía de los equipos para consumir el sistema", { type: "scale", sub: "Autonomía" }),
];

/* =====================================================================
   D. Foundations / tokens (14%) — 20
   ===================================================================== */
const D: Spec[] = [
  s("Existen design tokens formales", { type: "boolean", critical: true, evidence: true, sub: "Tokens" }),
  s("Separación primitive/reference, semantic/system y component tokens", { type: "single", optionSet: "TOKEN_TIERS", critical: true, condition: { questionCode: "D1", equals: true }, sub: "Arquitectura" }),
  s("Existe arquitectura para light y dark mode", { type: "boolean", sub: "Theming" }),
  s("Existe arquitectura multi-brand o white label", { type: "boolean", sub: "Multi-brand" }),
  s("Existe arquitectura multi-plataforma (web, iOS, Android, etc.)", { type: "multi", optionSet: "MULTIPLATFORM", sub: "Multi-plataforma" }),
  s("Existe naming convention consistente", { type: "boolean", evidence: true, sub: "Naming" }),
  s("Hay documentación de uso de tokens", { type: "boolean", sub: "Docs" }),
  s("Hay trazabilidad entre Figma variables y código", { type: "scale", critical: true, evidence: true, sub: "Trazabilidad" }),
  s("Hay sincronización diseño-desarrollo", { type: "scale", sub: "Sync" }),
  s("Hay control de versiones de tokens", { type: "boolean", sub: "Versionado" }),
  s("Hay pipeline de publicación", { type: "boolean", evidence: true, sub: "Pipeline" }),
  s("Hay validación de breaking changes", { type: "boolean", sub: "Breaking changes" }),
  s("Hay criterios de escalabilidad", { type: "scale", sub: "Escalabilidad" }),
  s("Hay soporte para theming", { type: "boolean", sub: "Theming" }),
  s("Hay prevención de duplicados", { type: "scale", sub: "Duplicados" }),
  s("Hay análisis de equivalencias entre tokenizaciones", { type: "open", sub: "Equivalencias" }),
  s("Hay criterios de accesibilidad en color, contraste, tamaño, motion, spacing y tipografía", { type: "scale", sub: "Accesibilidad" }),
  s("Hay estrategia de contextos, modos y estados", { type: "scale", sub: "Contextos" }),
  s("Hay criterios para tokens globales, semánticos y de componente", { type: "single", optionSet: "TOKEN_SCOPES", sub: "Scopes" }),
  s("Hay revisión de consistencia entre tokens de diseño y código", { type: "scale", evidence: true, sub: "Consistencia" }),
];

/* =====================================================================
   E. Componentes (12%) — 19
   ===================================================================== */
const E: Spec[] = [
  s("Existen componentes base definidos", { type: "boolean", sub: "Base" }),
  s("Existen patrones de experiencia", { type: "scale", sub: "Patrones" }),
  s("Existe paridad entre Figma y código", { type: "scale", critical: true, evidence: true, sub: "Paridad" }),
  s("Existen variantes y propiedades bien estructuradas", { type: "scale", sub: "Variantes" }),
  s("Hay criterios de composición", { type: "scale", sub: "Composición" }),
  s("Hay componentes responsive", { type: "boolean", sub: "Responsive" }),
  s("Hay soporte multi-framework si aplica", { type: "multi", optionSet: "MULTIFRAMEWORK", sub: "Multi-framework" }),
  s("Hay Storybook o equivalente", { type: "integration", evidence: true, sub: "Storybook" }),
  s("Hay versionamiento semántico", { type: "boolean", sub: "SemVer" }),
  s("Hay changelog", { type: "boolean", sub: "Changelog" }),
  s("Hay documentación técnica", { type: "scale", sub: "Docs técnicas" }),
  s("Hay criterios de deprecación", { type: "boolean", sub: "Deprecación" }),
  s("Hay componentes legacy identificados", { type: "boolean", sub: "Legacy" }),
  s("Hay roadmap de migración", { type: "boolean", condition: { questionCode: "E13", equals: true }, sub: "Migración" }),
  s("Hay análisis de consumo por producto o célula", { type: "scale", sub: "Consumo" }),
  s("Hay consistencia entre librería visual y técnica", { type: "scale", sub: "Consistencia" }),
  s("Hay criterios de performance", { type: "scale", sub: "Performance" }),
  s("Hay criterios de accesibilidad por componente", { type: "scale", sub: "Accesibilidad" }),
  s("Hay patrones documentados para formularios, navegación, tablas, feedback, etc.", { type: "multi", optionSet: "PATTERNS", sub: "Patrones doc" }),
];

/* =====================================================================
   F. Documentación (10%) — 20
   ===================================================================== */
const F: Spec[] = [
  s("Existe un portal de documentación", { type: "boolean", critical: true, evidence: true, sub: "Portal" }),
  s("La documentación está actualizada", { type: "scale", sub: "Frescura" }),
  s("Hay guidelines de uso", { type: "boolean", sub: "Guidelines" }),
  s("Hay do's and don'ts", { type: "boolean", sub: "Do/Don't" }),
  s("Hay ejemplos reales", { type: "scale", sub: "Ejemplos" }),
  s("Hay documentación para diseño", { type: "boolean", sub: "Audiencia" }),
  s("Hay documentación para desarrollo", { type: "boolean", sub: "Audiencia" }),
  s("Hay documentación para producto", { type: "boolean", sub: "Audiencia" }),
  s("Hay criterios de accesibilidad en la documentación", { type: "scale", sub: "Accesibilidad" }),
  s("Hay criterios de contenido", { type: "scale", sub: "Contenido" }),
  s("Hay guías de migración", { type: "boolean", sub: "Migración" }),
  s("Hay onboarding para nuevos usuarios", { type: "boolean", sub: "Onboarding" }),
  s("Hay playbooks", { type: "boolean", sub: "Playbooks" }),
  s("Hay plantillas", { type: "boolean", sub: "Plantillas" }),
  s("Hay entrenamiento o capacitaciones", { type: "scale", sub: "Enablement" }),
  s("Se mide el uso de la documentación", { type: "number", numberSet: "PCT", sub: "Consumo" }),
  s("Hay feedback loop sobre la documentación", { type: "boolean", sub: "Feedback" }),
  s("Hay documentación del contribution model", { type: "boolean", sub: "Contribución" }),
  s("Hay documentación de decisiones técnicas y de diseño", { type: "scale", sub: "ADRs" }),
  s("Hay trazabilidad entre componente, token, guideline y ejemplo", { type: "scale", sub: "Trazabilidad" }),
];

/* =====================================================================
   G. Calidad / testing (12%) — 20
   ===================================================================== */
const G: Spec[] = [
  s("Existen unit tests para componentes", { type: "number", numberSet: "COVERAGE", critical: true, evidence: true, sub: "Unit" }),
  s("Existen visual regression tests", { type: "boolean", evidence: true, sub: "Visual" }),
  s("Existen accessibility tests", { type: "boolean", critical: true, evidence: true, sub: "A11y" }),
  s("Existen pruebas de contraste", { type: "boolean", sub: "Contraste" }),
  s("Existen pruebas de responsive behavior", { type: "boolean", sub: "Responsive" }),
  s("Existen pruebas de tokens", { type: "boolean", sub: "Tokens" }),
  s("Existen pruebas de integración", { type: "boolean", sub: "Integración" }),
  s("Existe QA diseño-dev", { type: "scale", sub: "QA" }),
  s("Existe revisión de paridad Figma-código", { type: "scale", sub: "Paridad" }),
  s("Existe validación de cambios antes de producción", { type: "boolean", sub: "Gate" }),
  s("Hay criterios WCAG definidos", { type: "single", optionSet: "WCAG", critical: true, sub: "WCAG" }),
  s("Hay cobertura de componentes críticos", { type: "number", numberSet: "COVERAGE", sub: "Cobertura" }),
  s("Hay reportes de errores", { type: "boolean", sub: "Errores" }),
  s("Hay monitoreo de defectos", { type: "scale", sub: "Defectos" }),
  s("Hay gates en CI/CD", { type: "boolean", critical: true, evidence: true, sub: "CI/CD" }),
  s("Hay checklist de release", { type: "boolean", sub: "Release" }),
  s("Hay criterios de aceptación claros", { type: "scale", sub: "Aceptación" }),
  s("Hay pruebas de breaking changes", { type: "boolean", sub: "Breaking" }),
  s("Hay auditorías periódicas de accesibilidad", { type: "boolean", sub: "Auditoría" }),
  s("Hay validación de estados, errores, focus, teclado, screen readers y contraste", { type: "multi", optionSet: "A11Y_VALIDATION", sub: "A11y detalle" }),
];

/* =====================================================================
   H. Métricas (10%) — 25
   ===================================================================== */
const H: Spec[] = [
  s("Hay un dashboard de métricas", { type: "boolean", evidence: true, sub: "Dashboard" }),
  s("Se mide adopción por diseño", { type: "boolean", sub: "Adopción" }),
  s("Se mide adopción por desarrollo", { type: "boolean", sub: "Adopción" }),
  s("Se mide uso por componente", { type: "boolean", sub: "Uso" }),
  s("Se mide detach", { type: "boolean", sub: "Detach" }),
  s("Se mide duplicación", { type: "boolean", sub: "Duplicación" }),
  s("Se mide deuda de diseño", { type: "boolean", sub: "Deuda diseño" }),
  s("Se mide deuda técnica", { type: "boolean", sub: "Deuda técnica" }),
  s("Se mide ahorro de tiempo", { type: "boolean", sub: "Eficiencia" }),
  s("Se mide reducción de retrabajo", { type: "boolean", sub: "Retrabajo" }),
  s("Se mide velocidad de entrega", { type: "boolean", sub: "Velocidad" }),
  s("Se mide cobertura de componentes", { type: "number", numberSet: "COVERAGE", sub: "Cobertura" }),
  s("Se mide satisfacción interna", { type: "boolean", sub: "Satisfacción" }),
  s("Se mide impacto en consistencia", { type: "boolean", sub: "Consistencia" }),
  s("Se mide impacto en accesibilidad", { type: "boolean", sub: "Accesibilidad" }),
  s("Se mide consumo de documentación", { type: "boolean", sub: "Docs" }),
  s("Se mide contribution rate", { type: "boolean", sub: "Contribución" }),
  s("Existe un health score del sistema", { type: "scale", sub: "Health" }),
  s("Se comparan métricas históricas", { type: "boolean", sub: "Histórico" }),
  s("Se mide tiempo de respuesta del core team", { type: "boolean", sub: "SLA" }),
  s("Se mide tiempo desde solicitud hasta release", { type: "boolean", sub: "Lead time" }),
  s("Se mide % de componentes con testing", { type: "number", numberSet: "COVERAGE", sub: "Testing" }),
  s("Se mide % de componentes documentados", { type: "number", numberSet: "COVERAGE", sub: "Docs" }),
  s("Se mide % de tokens usados correctamente", { type: "number", numberSet: "COVERAGE", sub: "Tokens" }),
  s("Se mide impacto en reducción de inconsistencias", { type: "boolean", sub: "Inconsistencias" }),
];

/* =====================================================================
   I. Integración / AI (8%) — 24
   ===================================================================== */
const I: Spec[] = [
  s("Está integrado al discovery", { type: "scale", sub: "Discovery" }),
  s("Está integrado a la definición de historias de usuario", { type: "boolean", sub: "Historias" }),
  s("Está integrado al diseño de flujos", { type: "boolean", sub: "Flujos" }),
  s("Está integrado al prototipado", { type: "boolean", sub: "Prototipado" }),
  s("Está integrado al handoff", { type: "scale", sub: "Handoff" }),
  s("Está integrado al desarrollo", { type: "scale", sub: "Desarrollo" }),
  s("Está integrado a QA", { type: "boolean", sub: "QA" }),
  s("Está integrado a releases", { type: "boolean", sub: "Releases" }),
  s("Está conectado a Jira, Linear o Azure DevOps", { type: "integration", sub: "Tracker" }),
  s("Está conectado a Figma", { type: "integration", sub: "Figma" }),
  s("Está conectado a Storybook", { type: "integration", sub: "Storybook" }),
  s("Está conectado a repositorios", { type: "integration", sub: "Repos" }),
  s("Hay automatización de tokens", { type: "boolean", evidence: true, sub: "Tokens auto" }),
  s("Hay generación automática de documentación", { type: "boolean", sub: "Docs auto" }),
  s("Hay detección de inconsistencias con AI", { type: "boolean", sub: "AI detect" }),
  s("Hay recomendaciones automáticas", { type: "boolean", sub: "AI reco" }),
  s("Hay análisis de adopción con AI", { type: "boolean", sub: "AI adopción" }),
  s("Hay validaciones automáticas", { type: "boolean", sub: "Validación" }),
  s("Hay agentes o workflows para acelerar diseño-desarrollo", { type: "scale", sub: "Agentes" }),
  s("Hay supervisión humana en puntos críticos", { type: "boolean", sub: "Human-in-loop" }),
  s("Hay criterios de confianza y revisión humana", { type: "boolean", sub: "Confianza" }),
  s("Hay automatización para comparar diseño vs código", { type: "boolean", sub: "Diff" }),
  s("Hay automatización para detectar deuda, duplicados y desviaciones", { type: "boolean", sub: "Deuda auto" }),
  s("Hay flujos AI-augmented para intake, priorización, documentación, QA y release", { type: "multi", optionSet: "AI_FLOWS", sub: "AI flows" }),
];

/* =====================================================================
   J. Sostenibilidad (4%) — 14
   ===================================================================== */
const J: Spec[] = [
  s("Hay proceso de mantenimiento", { type: "boolean", sub: "Mantenimiento" }),
  s("Hay backlog priorizado", { type: "boolean", sub: "Backlog" }),
  s("Hay roadmap vivo", { type: "boolean", sub: "Roadmap" }),
  s("Hay criterios de sunset/deprecación", { type: "boolean", sub: "Sunset" }),
  s("Hay control de deuda", { type: "scale", sub: "Deuda" }),
  s("Hay responsables por dominio", { type: "boolean", sub: "Ownership" }),
  s("Hay cadencia de releases", { type: "single", optionSet: "RELEASE_CADENCE", sub: "Cadencia" }),
  s("Hay revisión periódica de componentes", { type: "boolean", sub: "Revisión" }),
  s("Hay gestión de feedback", { type: "scale", sub: "Feedback" }),
  s("Hay modelo de evolución", { type: "scale", sub: "Evolución" }),
  s("Hay presupuesto o capacidad asignada", { type: "single", optionSet: "BUDGET", critical: true, sub: "Capacidad" }),
  s("Hay continuidad operativa", { type: "scale", sub: "Continuidad" }),
  s("Hay monitoreo de uso y salud", { type: "boolean", sub: "Monitoreo" }),
  s("Hay capacidad de escalar a nuevas marcas, países, equipos o tecnologías", { type: "scale", sub: "Escalabilidad" }),
];

const GROUPS: Record<DimId, Spec[]> = { A, B, C, D, E, F, G, H, I, J };

/* ---------------- Builder ---------------- */
export function buildBank(): Question[] {
  const out: Question[] = [];
  (Object.keys(GROUPS) as DimId[]).forEach((dim) => {
    const dimMeta = DIMENSIONS.find((d) => d.id === dim)!;
    GROUPS[dim].forEach((spec, i) => {
      const type = spec.type ?? "scale";
      out.push({
        code: `${dim}${i + 1}`,
        dimension: dim,
        subdimension: spec.sub ?? dimMeta.short,
        text: spec.text,
        type,
        weight: spec.weight ?? (spec.critical ? 2 : 1),
        role: spec.role ?? dimMeta.role,
        critical: !!spec.critical,
        evidenceRequired: !!spec.evidence,
        expectedLevel: spec.expected ?? 3,
        riskIfMissing: `Brecha en ${dimMeta.short}: "${spec.text}" no demostrable.`,
        recommendationKey: dim,
        options: spec.optionSet ? OPTIONS[spec.optionSet] : undefined,
        number: spec.numberSet ? NUMBERS[spec.numberSet] : undefined,
        condition: spec.condition,
      });
    });
  });
  return out;
}

export const QUESTIONS = buildBank();

// Verificación: 7+11+17+20+19+20+20+25+24+14 = 177
export const QUESTION_COUNT = QUESTIONS.length;
if (typeof process !== "undefined" && QUESTION_COUNT !== 177) {
  // eslint-disable-next-line no-console
  console.warn(`[questions] esperado 177, generado ${QUESTION_COUNT}`);
}
