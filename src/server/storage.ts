import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

/**
 * Upload store for member documents, logos and profile pictures.
 *
 * Writes to ./storage on a normal server (local dev, Docker, Render,
 * Railway) where the disk persists. On Vercel the project directory is
 * read-only, so it falls back to the writable temp directory — uploads
 * succeed and the flow works end-to-end, but files do NOT survive between
 * requests. That is acceptable for a demo and unacceptable for production:
 * swap this one function for S3 / Vercel Blob at go-live (see DEPLOYMENT.md).
 */
const ON_SERVERLESS = Boolean(process.env.VERCEL);
const ROOT = ON_SERVERLESS
  ? path.join(os.tmpdir(), "membership-storage")
  : path.join(process.cwd(), "storage");

export async function saveUpload(file: File, prefix: string): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${prefix}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) throw new Error("File too large (10 MB max).");
  await writeFile(path.join(ROOT, key), bytes);
  return key;
}

export function storagePath(key: string): string {
  const resolved = path.join(ROOT, path.normalize(key));
  if (!resolved.startsWith(ROOT)) throw new Error("Invalid path.");
  return resolved;
}
