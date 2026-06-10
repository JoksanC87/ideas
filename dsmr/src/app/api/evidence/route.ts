import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { createEvidenceSchema } from "@/lib/schemas";
import { analyzeEvidence, type EvidenceKind } from "@/lib/evidence-signals";
import { readText } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "assessment:read")) return forbidden();
  const assessmentId = req.nextUrl.searchParams.get("assessmentId") ?? undefined;

  const data = await withTenant(ctx.orgId, async (tx) => {
    const items = await tx.evidence.findMany({
      where: { assessmentId },
      include: { response: { include: { question: { select: { code: true, dimension: { select: { code: true, short: true } } } } } } },
      orderBy: { createdAt: "desc" },
    });
    const total = items.length;
    const validated = items.filter((e) => e.validated).length;
    const avgQuality = total ? Math.round(items.reduce((s, e) => s + (e.qualityScore ?? 0), 0) / total) : 0;
    return { items, summary: { total, validated, pending: total - validated, avgQuality } };
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "response:write")) return forbidden();

  try {
    const input = createEvidenceSchema.parse(await req.json());
    const created = await withTenant(ctx.orgId, async (tx) => {
      // resolver responseId desde questionCode si hace falta
      let responseId = input.responseId ?? null;
      if (!responseId && input.questionCode) {
        const a = await tx.assessment.findUniqueOrThrow({ where: { id: input.assessmentId }, select: { modelId: true } });
        const q = await tx.question.findUnique({ where: { modelId_code: { modelId: a.modelId, code: input.questionCode } }, select: { id: true } });
        if (q) {
          const r = await tx.response.findUnique({ where: { assessmentId_questionId: { assessmentId: input.assessmentId, questionId: q.id } }, select: { id: true } });
          responseId = r?.id ?? null;
        }
      }

      // contenido para análisis: inline o leído de storage (archivos pequeños)
      let content = input.content ?? null;
      const filename = input.storageRef ? input.storageRef.split("/").pop() : undefined;
      if (!content && input.storageRef) content = await readText(input.storageRef);

      const analysis = analyzeEvidence({
        url: input.url, filename, title: input.title,
        declaredType: input.type as EvidenceKind | undefined, content,
      });

      return tx.evidence.create({
        data: {
          orgId: ctx.orgId, assessmentId: input.assessmentId, responseId,
          type: (input.type ?? analysis.kind) as any, url: input.url, storageRef: input.storageRef, title: input.title,
          qualityScore: analysis.qualityScore, aiSummary: analysis.summary,
          validated: false,
        },
      });
    });
    return NextResponse.json({ evidence: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
