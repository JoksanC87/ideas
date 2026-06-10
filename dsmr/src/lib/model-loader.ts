import type { Prisma } from "@prisma/client";
import type { ScoringModel, SQuestion } from "./scoring";
import type { QType, Option, NumberConfig, Condition } from "../data/questions";

const QTYPE: Record<string, QType> = {
  SCALE: "scale", BOOLEAN: "boolean", SINGLE: "single", MULTI: "multi",
  NUMBER: "number", OPEN: "open", URL: "url", UPLOAD: "upload", INTEGRATION: "integration",
};

/**
 * Reconstruye el ScoringModel desde la DB para un modelId dado.
 * Reemplaza el banco estático: el scoring usa las preguntas/pesos del modelo
 * del assessment, así que los modelos editados por cliente puntúan correcto.
 */
export async function loadScoringModel(tx: Prisma.TransactionClient, modelId: string): Promise<ScoringModel> {
  const model = await tx.maturityModel.findUniqueOrThrow({
    where: { id: modelId },
    include: {
      dimensions: { orderBy: { order: "asc" } },
      questions: { include: { dimension: { select: { code: true } } }, orderBy: { order: "asc" } },
    },
  });

  const dimensions = model.dimensions.map((d) => ({ code: d.code, short: d.short, weight: d.weight }));
  const questions: SQuestion[] = model.questions.map((q) => ({
    code: q.code,
    dimension: q.dimension.code,
    type: QTYPE[q.type],
    weight: q.weight,
    critical: q.critical,
    options: (q.options as Option[] | null) ?? undefined,
    number: (q.number as NumberConfig | null) ?? undefined,
    condition: (q.condition as Condition | null) ?? undefined,
  }));

  return { dimensions, questions };
}
