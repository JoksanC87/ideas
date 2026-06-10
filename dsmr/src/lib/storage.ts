/**
 * Cloud Storage para evidencias. Usa URLs firmadas v4 para que el cliente
 * suba directo al bucket (sin pasar el archivo por el servidor).
 * Config: env GCS_BUCKET + credenciales por ADC (GOOGLE_APPLICATION_CREDENTIALS).
 */
import { Storage } from "@google-cloud/storage";

const BUCKET = process.env.GCS_BUCKET;
let _storage: Storage | null = null;
function gcs(): Storage {
  if (!_storage) _storage = new Storage(); // ADC
  return _storage;
}
export const storageConfigured = () => !!BUCKET;

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

/** Ruta determinista y aislada por organización. */
export function buildStorageRef(orgId: string, assessmentId: string, filename: string) {
  return `orgs/${orgId}/assessments/${assessmentId}/${Date.now()}-${sanitize(filename)}`;
}

/** URL firmada (PUT) para subir un archivo. Expira en 15 min. */
export async function getSignedUploadUrl(storageRef: string, contentType: string) {
  if (!BUCKET) throw new Error("GCS_BUCKET no configurado");
  const [url] = await gcs().bucket(BUCKET).file(storageRef).getSignedUrl({
    version: "v4", action: "write", expires: Date.now() + 15 * 60 * 1000, contentType,
  });
  return url;
}

/** URL firmada (GET) para leer/descargar una evidencia. Expira en 1 h. */
export async function getSignedReadUrl(storageRef: string) {
  if (!BUCKET) throw new Error("GCS_BUCKET no configurado");
  const [url] = await gcs().bucket(BUCKET).file(storageRef).getSignedUrl({
    version: "v4", action: "read", expires: Date.now() + 60 * 60 * 1000,
  });
  return url;
}

/** Lee como texto un archivo pequeño (para parsear tokens/JSON). */
export async function readText(storageRef: string, maxBytes = 512 * 1024): Promise<string | null> {
  if (!BUCKET) return null;
  try {
    const [meta] = await gcs().bucket(BUCKET).file(storageRef).getMetadata();
    if (Number(meta.size) > maxBytes) return null;
    const [buf] = await gcs().bucket(BUCKET).file(storageRef).download();
    return buf.toString("utf8");
  } catch { return null; }
}
