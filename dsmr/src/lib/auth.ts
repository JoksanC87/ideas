import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabase } from "./supabase/server";
import { withBypass } from "./db";

export type Role =
  | "SUPER_ADMIN" | "ORG_ADMIN" | "DS_LEAD" | "DESIGNOPS"
  | "DESIGNER" | "ENGINEER" | "PM" | "AUDITOR";

export interface Ctx { userId: string; orgId: string; role: Role; email: string }

export type Action =
  | "company:read" | "company:write"
  | "assessment:read" | "assessment:write"
  | "response:write" | "recompute" | "evidence:validate"
  | "model:read" | "model:write" | "assessment:close";

const PERMISSIONS: Record<Action, Role[]> = {
  "company:read":      ["ORG_ADMIN", "DS_LEAD", "DESIGNOPS", "DESIGNER", "ENGINEER", "PM", "AUDITOR"],
  "company:write":     ["ORG_ADMIN"],
  "assessment:read":   ["ORG_ADMIN", "DS_LEAD", "DESIGNOPS", "DESIGNER", "ENGINEER", "PM", "AUDITOR"],
  "assessment:write":  ["ORG_ADMIN", "DS_LEAD", "AUDITOR"],
  "assessment:close":  ["ORG_ADMIN", "DS_LEAD", "AUDITOR"],
  "response:write":    ["ORG_ADMIN", "DS_LEAD", "DESIGNOPS", "DESIGNER", "ENGINEER", "AUDITOR"],
  "recompute":         ["ORG_ADMIN", "DS_LEAD", "AUDITOR"],
  "evidence:validate": ["ORG_ADMIN", "DS_LEAD", "AUDITOR"],
  "model:read":        ["ORG_ADMIN", "DS_LEAD", "DESIGNOPS", "DESIGNER", "ENGINEER", "PM", "AUDITOR"],
  "model:write":       ["ORG_ADMIN", "DS_LEAD"],
};

export function can(role: Role, action: Action): boolean {
  return role === "SUPER_ADMIN" || PERMISSIONS[action].includes(role);
}

/**
 * Resuelve el contexto desde la sesión de Supabase + Membership.
 * - Usuario: por authId (Supabase) o, como fallback, por email.
 * - Organización activa: header `x-active-org` o cookie `active_org`;
 *   si el usuario tiene una sola membresía, se usa esa.
 * Devuelve null si no hay sesión o no hay membresía válida.
 */
export async function getContext(req: NextRequest): Promise<Ctx | null> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const requestedOrg =
    req.headers.get("x-active-org") ?? req.cookies.get("active_org")?.value ?? undefined;

  return withBypass(async (tx) => {
    const dbUser = await tx.user.findFirst({
      where: { OR: [{ authId: user.id }, { email: user.email! }] },
      include: { memberships: true },
    });
    if (!dbUser || dbUser.memberships.length === 0) return null;

    let membership =
      (requestedOrg && dbUser.memberships.find((m) => m.orgId === requestedOrg)) ||
      (dbUser.memberships.length === 1 ? dbUser.memberships[0] : null);
    if (!membership) return null; // multi-org sin selección → el cliente debe elegir

    return { userId: dbUser.id, orgId: membership.orgId, role: membership.role as Role, email: dbUser.email };
  });
}

export const unauthorized = () => NextResponse.json({ error: "No autenticado" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Sin permiso" }, { status: 403 });
export const badRequest = (detail: unknown) => NextResponse.json({ error: "Datos inválidos", detail }, { status: 400 });
export const conflict = (msg: string) => NextResponse.json({ error: msg }, { status: 409 });
