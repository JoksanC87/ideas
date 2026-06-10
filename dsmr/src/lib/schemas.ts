import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  platforms: z.array(z.string().max(40)).max(20).default([]),
  teams: z.number().int().min(0).max(10000).default(0),
});

export const createAssessmentSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().max(160).optional(),
  scopeId: z.string().optional(),
  modelId: z.string().optional(),
  duplicateFrom: z.string().optional(),
});

const answerValue = z.union([z.number(), z.boolean(), z.string(), z.array(z.string()), z.null()]);

export const upsertResponsesSchema = z.object({
  responses: z.array(z.object({
    questionCode: z.string().min(1),
    value: answerValue.optional(),
    evidence: z.boolean().optional(),
    evidenceUrl: z.string().url().optional().or(z.literal("")),
    connected: z.boolean().optional(),
    comment: z.string().max(2000).optional(),
    uncertain: z.boolean().optional(),
  })).min(1).max(200),
});

export const closeAssessmentSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(1000).optional(),
});

/* ----------------- Assessment builder ----------------- */
export const createModelSchema = z.object({
  name: z.string().min(2).max(120),
  cloneFrom: z.string().optional(),   // clona dimensiones + preguntas de otro modelo
  setActive: z.boolean().optional(),
});

export const updateModelSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  levelBands: z.array(z.object({ min: z.number(), max: z.number(), label: z.string() })).optional(),
  // edición de pesos por dimensión (deben sumar ~1.0)
  weights: z.array(z.object({ code: z.string(), weight: z.number().min(0).max(1) })).optional(),
}).refine((d) => {
  if (!d.weights) return true;
  const sum = d.weights.reduce((s, w) => s + w.weight, 0);
  return sum > 0.98 && sum < 1.02;
}, { message: "Los pesos de dimensión deben sumar 1.0 (±0.02)." });

const optionSchema = z.object({ label: z.string(), score: z.number().min(0).max(100) });
const numberSchema = z.object({
  unit: z.string(), identity: z.boolean().optional(), inverse: z.boolean().optional(),
  bands: z.array(z.object({ upTo: z.number(), score: z.number() })).optional(),
});

export const questionCreateSchema = z.object({
  dimensionCode: z.string().min(1),
  text: z.string().min(4).max(400),
  type: z.enum(["SCALE", "BOOLEAN", "SINGLE", "MULTI", "NUMBER", "OPEN", "URL", "UPLOAD", "INTEGRATION"]),
  weight: z.number().min(0).max(10).default(1),
  role: z.enum(["DS_LEAD", "DESIGNOPS", "DESIGNER", "ENGINEER", "PM"]).default("DESIGNER"),
  critical: z.boolean().default(false),
  evidenceRequired: z.boolean().default(false),
  subdimension: z.string().max(80).optional(),
  options: z.array(optionSchema).optional(),
  number: numberSchema.optional(),
  condition: z.object({ questionCode: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]) }).optional(),
});

export const questionUpdateSchema = questionCreateSchema.partial();

export const uploadUrlSchema = z.object({
  assessmentId: z.string().min(1),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
});

export const updateEvidenceSchema = z.object({
  validated: z.boolean().optional(),
  type: z.string().optional(),
  title: z.string().max(200).optional(),
});

export const createEvidenceSchema = z.object({
  assessmentId: z.string().min(1),
  questionCode: z.string().optional(),
  responseId: z.string().optional(),
  type: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  storageRef: z.string().optional(),
  title: z.string().max(200).optional(),
  content: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
