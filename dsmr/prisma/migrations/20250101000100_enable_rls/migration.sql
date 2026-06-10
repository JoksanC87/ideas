-- Migración manual: Row-Level Security multi-tenant
-- Se aplica DESPUÉS de la migración `init` generada por Prisma.
-- El backend debe ejecutar por request:  SELECT set_config('app.current_org', $orgId, true);
-- El seed/admin puede usar:               SET app.bypass_rls = 'on';

-- Helper: org del request actual (vacío si no hay contexto)
CREATE OR REPLACE FUNCTION current_org() RETURNS text AS $$
  SELECT current_setting('app.current_org', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION rls_bypass() RETURNS boolean AS $$
  SELECT coalesce(current_setting('app.bypass_rls', true), 'off') = 'on';
$$ LANGUAGE sql STABLE;

-- Tablas tenant con "orgId" NOT NULL: aislamiento estricto por organización
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'memberships','companies','assessments','responses','evidence',
    'scores','recommendations','reports','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (rls_bypass() OR "orgId" = current_org())
      WITH CHECK (rls_bypass() OR "orgId" = current_org());
    $f$, t);
  END LOOP;
END $$;

-- Tablas con "orgId" NULLABLE: filas globales (orgId IS NULL) visibles para todos
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['maturity_models','benchmarks'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_or_global ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_or_global ON %I
      USING (rls_bypass() OR "orgId" IS NULL OR "orgId" = current_org())
      WITH CHECK (rls_bypass() OR "orgId" = current_org());
    $f$, t);
  END LOOP;
END $$;

-- dimensions y questions no llevan "orgId": heredan el aislamiento de su modelo
-- vía la capa de aplicación (siempre se consultan por modelId del assessment).
-- Si se requiere RLS estricta, añadir "orgId" denormalizado a estas tablas.
