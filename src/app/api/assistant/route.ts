import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { getAssistantConfig } from "@/server/assistant/config";
import { prepareAnswer } from "@/server/assistant/answer";
import { ProviderError } from "@/server/assistant/providers";
import { reindexSite } from "@/server/assistant/knowledge";

/**
 * The public chatbot endpoint.
 *  GET  → { enabled } so the widget knows whether to show itself.
 *  POST → a streamed answer. The first line is JSON metadata
 *         ({ sessionId, messageId, sources }); everything after it is the
 *         answer text as it is generated.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A streamed answer can run past the default function timeout.
export const maxDuration = 60;

const Body = z.object({
  sessionId: z.string().max(40).optional(),
  page: z.string().max(200).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

// Per-instance limiter: 20 questions per 10 minutes per visitor.
const hits = new Map<string, number[]>();
function limited(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 20;
}

const ipHash = (req: Request) =>
  createHash("sha256")
    .update(`${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}:${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 24);

export async function GET() {
  const cfg = await getAssistantConfig();
  return Response.json({ enabled: cfg.enabled && !!cfg.groqKey });
}

export async function POST(req: Request) {
  const cfg = await getAssistantConfig();
  if (!cfg.enabled || !cfg.groqKey) return Response.json({ error: "The assistant is not available right now." }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { messages, page } = parsed.data;
  if (messages[messages.length - 1].role !== "user") return Response.json({ error: "Invalid request." }, { status: 400 });

  const who = ipHash(req);
  if (limited(who)) return Response.json({ error: "You've asked a lot of questions in a short time — please try again in a few minutes." }, { status: 429 });

  const session =
    (parsed.data.sessionId && (await db.chatSession.findUnique({ where: { id: parsed.data.sessionId } }))) ||
    (await db.chatSession.create({ data: { ipHash: who, page: page ?? null } }));
  const question = messages[messages.length - 1].content;
  await db.chatMessage.create({ data: { sessionId: session.id, role: "user", content: question } });

  let prepared;
  try {
    // First question on a fresh install: build the knowledge base on the spot.
    if ((await db.knowledgeChunk.count()) === 0) await reindexSite(new URL(req.url).origin, cfg.geminiKey);
    prepared = await prepareAnswer(cfg, messages);
  } catch (e) {
    console.error("[assistant] retrieval failed", e);
    return Response.json({ error: "The assistant hit a problem — please try again." }, { status: 502 });
  }
  const reply = await db.chatMessage.create({
    data: { sessionId: session.id, role: "assistant", content: "", sources: prepared.sources },
  });

  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the visitor closes the panel mid-answer, enqueue throws; keep
      // generating anyway so the full answer still reaches the admin log.
      let open = true;
      const push = (s: string) => {
        if (!open) return;
        try { controller.enqueue(enc.encode(s)); } catch { open = false; }
      };
      push(JSON.stringify({ sessionId: session.id, messageId: reply.id, sources: prepared.sources, mode: prepared.mode }) + "\n");
      let text = "";
      try {
        for await (const delta of prepared.stream()) {
          text += delta;
          push(delta);
        }
      } catch (e) {
        const msg = e instanceof ProviderError && e.status === 429
          ? "\n\nThe assistant is busy right now — please try again in a moment."
          : "\n\nSorry — the answer was interrupted. Please try again.";
        console.error("[assistant] generation failed", e);
        text += msg;
        push(msg);
      }
      await db.chatMessage.update({ where: { id: reply.id }, data: { content: text } }).catch(() => {});
      if (open) { try { controller.close(); } catch { /* already closed */ } }
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
