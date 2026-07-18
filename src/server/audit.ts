import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Append-only audit trail (DB trigger blocks UPDATE/DELETE). */
export async function audit(entry: {
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
}) {
  await db.auditLog.create({ data: entry });
}
