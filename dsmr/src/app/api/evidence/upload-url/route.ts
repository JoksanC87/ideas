import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContext, can, unauthorized, forbidden, badRequest, conflict } from "@/lib/auth";
import { uploadUrlSchema } from "@/lib/schemas";
import { storageConfigured, buildStorageRef, getSignedUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const ctx = await getContext(req);
  if (!ctx) return unauthorized();
  if (!can(ctx.role, "response:write")) return forbidden();
  if (!storageConfigured()) return conflict("Cloud Storage no configurado (GCS_BUCKET).");

  try {
    const { assessmentId, filename, contentType } = uploadUrlSchema.parse(await req.json());
    const storageRef = buildStorageRef(ctx.orgId, assessmentId, filename);
    const uploadUrl = await getSignedUploadUrl(storageRef, contentType);
    // El cliente sube con PUT a uploadUrl y luego confirma con POST /api/evidence { storageRef }
    return NextResponse.json({ uploadUrl, storageRef });
  } catch (e) {
    if (e instanceof ZodError) return badRequest(e.flatten());
    throw e;
  }
}
