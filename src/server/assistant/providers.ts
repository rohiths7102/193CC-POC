import "server-only";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "./config";

/** Groq (OpenAI-compatible) chat, and Gemini embeddings. Plain fetch, no SDKs. */

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

/** Overridable for a proxy or a local test double; defaults to Groq itself. */
const GROQ = process.env.GROQ_BASE_URL?.replace(/\/$/, "") || "https://api.groq.com/openai/v1";

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function groqFetch(key: string, path: string, body?: unknown) {
  const res = await fetch(`${GROQ}${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ""; } catch { /* not json */ }
    throw new ProviderError(`Groq ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }
  return res;
}

/** One-shot completion (used to rewrite follow-up questions for search). */
export async function groqComplete(key: string, model: string, messages: ChatTurn[], maxTokens = 120): Promise<string> {
  const res = await groqFetch(key, "/chat/completions", { model, messages, temperature: 0, max_tokens: maxTokens });
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Streaming completion — yields text deltas as they arrive. */
export async function* groqStream(key: string, model: string, messages: ChatTurn[], temperature: number): AsyncGenerator<string> {
  const res = await groqFetch(key, "/chat/completions", { model, messages, temperature, max_tokens: 900, stream: true });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* keep-alive or partial line */ }
    }
  }
}

/** The chat models this key can use (for the admin model picker). */
export async function groqModels(key: string): Promise<string[]> {
  const res = await groqFetch(key, "/models");
  const json = (await res.json()) as { data?: { id: string; active?: boolean }[] };
  return (json.data ?? [])
    .filter((m) => m.active !== false && !/whisper|tts|guard|playai/i.test(m.id))
    .map((m) => m.id)
    .sort();
}

/** Gemini embeddings, batched. `query` selects the retrieval-query task type. */
export async function geminiEmbed(key: string, texts: string[], kind: "document" | "query"): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 90) {
    const batch = texts.slice(i, i + 90);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
            outputDimensionality: EMBEDDING_DIMS,
          })),
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new ProviderError(`Gemini embeddings ${res.status}`, res.status);
    const json = (await res.json()) as { embeddings?: { values: number[] }[] };
    for (const e of json.embeddings ?? []) out.push(e.values);
  }
  return out;
}
