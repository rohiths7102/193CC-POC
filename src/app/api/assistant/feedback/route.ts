import { z } from "zod";
import { db } from "@/server/db";

/** Thumbs up / down on one assistant answer, shown on Admin → AI assistant. */
export const runtime = "nodejs";

const Body = z.object({ messageId: z.string().max(40), sessionId: z.string().max(40), value: z.union([z.literal(1), z.literal(-1)]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  // Scoped to the session the browser holds, so one visitor can't rate another's chat.
  const res = await db.chatMessage.updateMany({
    where: { id: parsed.data.messageId, sessionId: parsed.data.sessionId, role: "assistant" },
    data: { feedback: parsed.data.value },
  });
  return Response.json({ ok: res.count === 1 });
}
