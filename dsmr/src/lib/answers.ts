/**
 * Mapeo respuestas (tipos mixtos) ↔ columnas de Response. Operan sobre una
 * pregunta del modelo (SQuestion) pasada como argumento — sin banco estático.
 */
import { normalize, type Answer, type SQuestion } from "./scoring";
import { QUESTIONS } from "@/data/questions";

/** Lookup estático por código de pregunta (banco de preguntas v1). */
export function questionByCode(code: string): SQuestion | undefined {
  return QUESTIONS.find((q) => q.code === code) as SQuestion | undefined;
}

export interface IncomingAnswer {
  questionCode: string;
  value?: number | boolean | string | string[] | null;
  evidence?: boolean;
  evidenceUrl?: string;
  connected?: boolean;
  comment?: string;
  uncertain?: boolean;
}

export function toColumns(q: SQuestion, a: IncomingAnswer) {
  const cols = {
    valueNumber: null as number | null,
    valueBool: null as boolean | null,
    valueText: null as string | null,
    valueList: [] as string[],
  };
  switch (q.type) {
    case "scale":
    case "number": cols.valueNumber = a.value == null ? null : Number(a.value); break;
    case "boolean": cols.valueBool = a.value == null ? null : Boolean(a.value); break;
    case "integration": cols.valueBool = a.connected ?? Boolean(a.value); break;
    case "multi": cols.valueList = Array.isArray(a.value) ? (a.value as string[]) : []; break;
    case "single":
    case "url":
    case "open": cols.valueText = a.value == null ? null : String(a.value); break;
  }
  return cols;
}

export function rowToAnswer(
  q: SQuestion,
  row: { valueNumber: number | null; valueBool: boolean | null; valueText: string | null; valueList: string[] },
  hasEvidence: boolean
): Answer {
  let value: Answer["value"] = null;
  let connected = false;
  switch (q.type) {
    case "scale":
    case "number": value = row.valueNumber; break;
    case "boolean": value = row.valueBool; break;
    case "integration": connected = !!row.valueBool; value = row.valueBool; break;
    case "multi": value = row.valueList; break;
    default: value = row.valueText;
  }
  return { value, evidence: hasEvidence, connected };
}

export function scoreOf(q: SQuestion, a: IncomingAnswer): number | null {
  return normalize(q, { value: a.value ?? null, evidence: !!(a.evidence || a.evidenceUrl), connected: a.connected });
}
