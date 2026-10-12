import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "../db";

/**
 * The assistant's configuration: Setting rows edited on Admin → AI assistant.
 * API keys are stored AES-256-GCM encrypted (key derived from SESSION_SECRET)
 * and are never sent back to the browser. A GROQ_API_KEY / GEMINI_API_KEY set
 * on the host overrides the stored one.
 */
export const ASSISTANT = {
  enabled: "assistant.enabled",
  model: "assistant.model",
  temperature: "assistant.temperature",
  instructions: "assistant.instructions",
  groqKey: "assistant.groq_key",
  geminiKey: "assistant.gemini_key",
} as const;

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMS = 768;

const secret = () => createHash("sha256").update(`assistant:${process.env.SESSION_SECRET ?? ""}`).digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secret(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [v, iv, tag, ct] = stored.split(":");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
  } catch {
    return null; // SESSION_SECRET rotated or value tampered with — treat as unset
  }
}

export type AssistantConfig = {
  enabled: boolean;
  model: string;
  temperature: number;
  instructions: string;
  groqKey: string | null;
  geminiKey: string | null;
  groqKeySource: "env" | "admin" | null;
  geminiKeySource: "env" | "admin" | null;
};

export async function getAssistantConfig(): Promise<AssistantConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: Object.values(ASSISTANT) } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const str = (k: string) => (typeof get(k) === "string" ? (get(k) as string) : "");
  const stored = (k: string) => (str(k) ? decryptSecret(str(k)) : null);

  const envGroq = process.env.GROQ_API_KEY?.trim() || null;
  const envGemini = process.env.GEMINI_API_KEY?.trim() || null;
  const adminGroq = stored(ASSISTANT.groqKey);
  const adminGemini = stored(ASSISTANT.geminiKey);
  const enabledRaw = get(ASSISTANT.enabled);
  const temp = Number(get(ASSISTANT.temperature));

  return {
    enabled: !(enabledRaw === false || enabledRaw === "false"),
    model: str(ASSISTANT.model) || DEFAULT_MODEL,
    temperature: Number.isFinite(temp) && temp >= 0 && temp <= 1.5 ? temp : 0.3,
    instructions: str(ASSISTANT.instructions),
    groqKey: envGroq ?? adminGroq,
    geminiKey: envGemini ?? adminGemini,
    groqKeySource: envGroq ? "env" : adminGroq ? "admin" : null,
    geminiKeySource: envGemini ? "env" : adminGemini ? "admin" : null,
  };
}

/** Last four characters only — enough to tell keys apart, useless if leaked. */
export const keyHint = (key: string | null) => (key ? `••••${key.slice(-4)}` : null);
