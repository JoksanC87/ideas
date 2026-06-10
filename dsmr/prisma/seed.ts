/**
 * Prisma seed — carga modelo de madurez v1 + 177 preguntas + datos demo.
 * Ejecutar:  npx prisma db seed
 * package.json:  "prisma": { "seed": "tsx prisma/seed.ts" }
 */
import { PrismaClient, QuestionType, Role } from "@prisma/client";
import { DIMENSIONS, QUESTIONS } from "../src/data/questions";

const prisma = new PrismaClient();

const TYPE_MAP: Record<string, QuestionType> = {
  scale: "SCALE", boolean: "BOOLEAN", single: "SINGLE", multi: "MULTI",
  number: "NUMBER", open: "OPEN", url: "URL", upload: "UPLOAD", integration: "INTEGRATION",
};
const ROLE_MAP: Record<string, Role> = {
  product: "PM", lead: "DS_LEAD", designops: "DESIGNOPS", designer: "DESIGNER", engineer: "ENGINEER",
};

const LEVEL_BANDS = [
  { min: 0, max: 20, label: "Inexistente / Fragmentado" },
  { min: 21, max: 40, label: "Inicial" },
  { min: 41, max: 60, label: "En construcción" },
  { min: 61, max: 75, label: "Operativo" },
  { min: 76, max: 90, label: "Escalable" },
  { min: 91, max: 100, label: "Optimizado / Inteligente" },
];

async function main() {
  // Permite que el seed escriba aunque RLS esté activo
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'on'`).catch(() => {});

  const org = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: { id: "demo-org", name: "Organización Demo", plan: "enterprise" },
  });

  // Modelo de madurez global v1
  const model = await prisma.maturityModel.upsert({
    where: { orgId_name_version: { orgId: null as any, name: "DSMR Modelo v1", version: 1 } },
    update: {},
    create: {
      name: "DSMR Modelo v1",
      version: 1,
      isActive: true,
      levelBands: LEVEL_BANDS,
      dimensions: {
        create: DIMENSIONS.map((d, i) => ({
          code: d.id, name: d.name, short: d.short, weight: d.weight, order: i,
        })),
      },
    },
    include: { dimensions: true },
  });

  const dimByCode = Object.fromEntries(model.dimensions.map((d) => [d.code, d.id]));

  // 177 preguntas
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    await prisma.question.upsert({
      where: { modelId_code: { modelId: model.id, code: q.code } },
      update: {},
      create: {
        modelId: model.id,
        dimensionId: dimByCode[q.dimension],
        code: q.code,
        subdimension: q.subdimension,
        text: q.text,
        type: TYPE_MAP[q.type],
        weight: q.weight,
        role: ROLE_MAP[q.role],
        critical: q.critical,
        evidenceRequired: q.evidenceRequired,
        expectedLevel: q.expectedLevel,
        riskIfMissing: q.riskIfMissing,
        recommendationKey: q.recommendationKey,
        options: q.options ? (q.options as any) : undefined,
        number: q.number ? (q.number as any) : undefined,
        condition: q.condition ? (q.condition as any) : undefined,
        order: i,
      },
    });
  }

  // Empresas demo
  const companies = [
    { id: "neobank", name: "NeoBank Global", industry: "Fintech", country: "México", platforms: ["Web", "iOS", "Android"], teams: 14 },
    { id: "continental", name: "Banco Continental", industry: "Banca", country: "Colombia", platforms: ["Web", "iOS", "Android", "Angular"], teams: 28 },
  ];
  for (const c of companies) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, orgId: org.id },
    });
  }

  // Usuario + membresía demo (para que el login resuelva contexto).
  // Inicia sesión en Supabase con este email y tendrás rol ORG_ADMIN en la org demo.
  const demoEmail = process.env.DEMO_EMAIL ?? "admin@demo.com";
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, name: "Admin Demo" },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: "ORG_ADMIN" },
    create: { userId: user.id, orgId: org.id, role: "ORG_ADMIN" },
  });

  console.log(`Seed OK · modelo v1 · ${QUESTIONS.length} preguntas · ${companies.length} empresas · usuario ${demoEmail}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
