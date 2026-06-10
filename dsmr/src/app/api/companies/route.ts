import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { createCompanySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "company:read")) return forbidden();

  const companies = await withTenant(ctx.orgId, (tx) =>
    tx.company.findMany({
      orderBy: { name: "asc" },
      include: {
        assessments: {
          where: { status: { notIn: ["ARCHIVED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
      },
    })
  );

  return NextResponse.json({
    companies: companies.map((c) => ({
      ...c,
      activeAssessmentId: c.assessments[0]?.id ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "company:write")) return forbidden();

  try {
    const input = createCompanySchema.parse(await req.json());
    const result = await withTenant(ctx.orgId, async (tx) => {
      const company = await tx.company.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          industry: input.industry,
          country: input.country,
          platforms: input.platforms,
          teams: input.teams,
        },
      });

      const model = await tx.maturityModel.findFirstOrThrow({
        where: { isActive: true },
        orderBy: { version: "desc" },
      });

      const assessment = await tx.assessment.create({
        data: {
          orgId: ctx.orgId,
          companyId: company.id,
          modelId: model.id,
          title: `Diagnóstico ${new Date().getFullYear()}`,
          status: "IN_PROGRESS",
          createdById: ctx.userId,
        },
      });

      return { company, assessmentId: assessment.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
