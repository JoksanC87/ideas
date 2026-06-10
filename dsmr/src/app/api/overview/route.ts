import { NextRequest, NextResponse } from "next/server";
import { getContext, can, unauthorized, forbidden } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { latestScores } from "@/lib/recompute";
import { DIMENSIONS } from "@/data/questions";
import { levelShortOf } from "@/lib/scoring";
import { THRESHOLDS } from "@/lib/recommendations";

export async function GET(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "company:read")) return forbidden();

  const payload = await withTenant(ctx.orgId, async (tx) => {
    const companies = await tx.company.findMany({
      include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const rows = await Promise.all(
      companies.map(async (c) => {
        const a = c.assessments[0];
        const s = a ? await latestScores(tx, a.id) : { global: 0, confidence: 0, dims: {} as Record<string, number> };
        return { id: c.id, name: c.name, industry: c.industry, country: c.country, global: s.global, dims: s.dims };
      })
    );

    const n = rows.length || 1;
    const avg = Math.round(rows.reduce((acc, r) => acc + r.global, 0) / n);
    const ranking = [...rows].sort((x, y) => y.global - x.global)
      .map((r) => ({ id: r.id, name: r.name, score: r.global, level: levelShortOf(r.global) }));

    const radar = DIMENSIONS.map((d) => ({
      dim: d.short, code: d.id,
      avg: Math.round(rows.reduce((acc, r) => acc + (r.dims[d.id] ?? 0), 0) / n),
    }));

    const heatmap = rows.map((r) => ({
      id: r.id, name: r.name, global: r.global,
      cells: DIMENSIONS.map((d) => ({ code: d.id, score: r.dims[d.id] ?? 0 })),
    }));

    const transversal = DIMENSIONS.map((d) => {
      const below = rows.filter((r) => (r.dims[d.id] ?? 0) < THRESHOLDS[d.id]);
      return {
        code: d.id, dim: d.short, count: below.length,
        avg: below.length ? Math.round(below.reduce((acc, r) => acc + (r.dims[d.id] ?? 0), 0) / below.length) : 0,
      };
    }).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

    return { avg, total: rows.length, ranking, radar, heatmap, transversal };
  });

  return NextResponse.json(payload);
}
