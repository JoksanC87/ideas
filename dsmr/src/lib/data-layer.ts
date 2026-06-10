/**
 * Cliente API completo para el front. Auth por cookie (Supabase); para multi-org
 * fija la organización activa con setActiveOrg(). Expone todos los endpoints.
 */
import type { Responses } from "./scoring";

const BASE = (globalThis as any).__API_BASE__ ?? "";
let ACTIVE_ORG: string | undefined;
export const setActiveOrg = (orgId: string) => { ACTIVE_ORG = orgId; };

async function req<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ACTIVE_ORG) headers["x-active-org"] = ACTIVE_ORG;
  const r = await fetch(`${BASE}${path}`, { method, headers, credentials: "include", body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}

export interface CompanyMeta { id: string; name: string; industry?: string | null; country?: string | null; platforms: string[]; teams: number }

export const api = {
  setActiveOrg,
  me: () => req("/api/me"),

  // Overview + empresas
  overview: () => req("/api/overview"),
  companies: () => req<{ companies: any[] }>("/api/companies").then((d) => d.companies),
  createCompany: (meta: Omit<CompanyMeta, "id">) => req("/api/companies", "POST", meta),

  // Assessment
  assessment: (id: string) => req(`/api/assessments/${id}`),
  saveResponses: (assessmentId: string, responses: { questionCode: string; value?: any; evidence?: boolean; evidenceUrl?: string; connected?: boolean; comment?: string; uncertain?: boolean }[]) =>
    req(`/api/assessments/${assessmentId}/responses`, "PUT", { responses }),
  recompute: (id: string) => req(`/api/assessments/${id}/recompute`, "POST"),
  aiEvaluate: (id: string) => req(`/api/assessments/${id}/ai-evaluate`, "POST"),
  closeAssessment: (id: string, approved: boolean, note?: string) => req(`/api/assessments/${id}/close`, "POST", { approved, note }),

  // Evidence hub
  listEvidence: (assessmentId: string) => req(`/api/evidence?assessmentId=${assessmentId}`),
  createEvidence: (payload: any) => req("/api/evidence", "POST", payload),
  uploadUrl: (payload: { assessmentId: string; filename: string; contentType: string }) => req("/api/evidence/upload-url", "POST", payload),
  validateEvidence: (id: string, validated: boolean) => req(`/api/evidence/${id}`, "PATCH", { validated }),
  deleteEvidence: (id: string) => req(`/api/evidence/${id}`, "DELETE"),

  // Assessment builder (modelos)
  listModels: () => req<{ models: any[] }>("/api/models").then((d) => d.models),
  getModel: (id: string) => req<{ model: any }>(`/api/models/${id}`).then((d) => d.model),
  createModel: (payload: { name: string; cloneFrom?: string; setActive?: boolean }) => req("/api/models", "POST", payload),
  updateModel: (id: string, payload: any) => req(`/api/models/${id}`, "PATCH", payload),
  addQuestion: (modelId: string, payload: any) => req(`/api/models/${modelId}/questions`, "POST", payload),
  updateQuestion: (modelId: string, code: string, payload: any) => req(`/api/models/${modelId}/questions/${code}`, "PATCH", payload),
  deleteQuestion: (modelId: string, code: string) => req(`/api/models/${modelId}/questions/${code}`, "DELETE"),

  // Subida directa a Cloud Storage (URL firmada)
  putFile: async (uploadUrl: string, file: File) => {
    const r = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!r.ok) throw new Error("Fallo la subida a storage");
  },
};

/* Helper: cargar respuestas de un assessment en el shape { code: Answer } */
export async function loadAssessmentResponses(id: string): Promise<{ responses: Responses; meta: any; recommendations: any[]; scores: any }> {
  const d = await api.assessment(id);
  return { responses: d.responses ?? {}, meta: d.assessment, recommendations: d.recommendations ?? [], scores: d.scores };
}
