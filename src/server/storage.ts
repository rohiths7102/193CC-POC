import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ROOT = path.join(process.cwd(), "storage");

/** Local-disk upload store (swap for S3 at go-live behind this same function). */
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
