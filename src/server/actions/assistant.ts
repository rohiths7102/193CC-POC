"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ASSISTANT, encryptSecret, getAssistantConfig } from "@/server/assistant/config";
import { addDocument, embedMissing, invalidateIndex, reindexSite } from "@/server/assistant/knowledge";
import { groqComplete } from "@/server/assistant/providers";

/** Admin → AI assistant. Every action needs configure_system and is audited
 *  (key VALUES are never written to the audit log — only that one changed). */

type Result = { ok?: string; error?: string } | undefined;
const PATH = "/portal/admin/assistant";

async function setSetting(key: string, value: string | number | boolean) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function saveAssistantSettingsAction(_p: Result, form: FormData): Promise<Result> {
  const admin = await requireUser("configure_system");
  const enabled = form.get("enabled") === "true";
  const model = String(form.get("model") ?? "").trim().slice(0, 120);
  const temperature = Number(form.get("temperature"));
  const instructions = String(form.get("instructions") ?? "").trim().slice(0, 4000);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1.5) return { error: "Creativity must be between 0 and 1.5." };
  await setSetting(ASSISTANT.enabled, enabled);
  if (model) await setSetting(ASSISTANT.model, model);
  await setSetting(ASSISTANT.temperature, temperature);
  await setSetting(ASSISTANT.instructions, instructions);
  await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.settings", entityType: "Setting", entityId: "assistant", after: { enabled, model, temperature } });
  revalidatePath(PATH);
  return { ok: "Saved." };
}

export async function saveAssistantKeyAction(_p: Result, form: FormData): Promise<Result> {
  const admin = await requireUser("configure_system");
  const provider = form.get("provider") === "gemini" ? "gemini" : "groq";
  const key = String(form.get("key") ?? "").trim();
  const settingKey = provider === "gemini" ? ASSISTANT.geminiKey : ASSISTANT.groqKey;

  if (form.get("clear") === "true") {
    await db.setting.deleteMany({ where: { key: settingKey } });
    await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.key_cleared", entityType: "Setting", entityId: provider });
    revalidatePath(PATH);
    return { ok: `${provider === "gemini" ? "Gemini" : "Groq"} key removed.` };
  }
  if (key.length < 20 || /\s/.test(key)) return { error: "That doesn't look like an API key." };

  // Prove the key works before storing it.
  if (provider === "groq") {
    try {
      const cfg = await getAssistantConfig();
      await groqComplete(key, cfg.model, [{ role: "user", content: "Reply with OK." }], 5);
    } catch (e) {
      return { error: `Groq rejected the key or model: ${(e as Error).message}` };
    }
  }
  await setSetting(settingKey, encryptSecret(key));
  await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.key_set", entityType: "Setting", entityId: provider });

  let note = "";
  if (provider === "gemini") {
    const errors: string[] = [];
    const n = await embedMissing(key, errors);
    invalidateIndex();
    note = errors.length ? ` Embedding failed: ${errors[0]}` : ` ${n} passages embedded — vector search is on.`;
  }
  revalidatePath(PATH);
  return { ok: `Key saved and encrypted.${note}` };
}

export async function reindexSiteAction(_p: Result): Promise<Result> {
  const admin = await requireUser("configure_system");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const cfg = await getAssistantConfig();
  const r = await reindexSite(origin, cfg.geminiKey);
  await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.reindex", entityType: "KnowledgeDoc", entityId: "site", after: { pages: r.pages, chunks: r.chunks, embedded: r.embedded } });
  revalidatePath(PATH);
  const base = `Indexed ${r.pages} pages and ${r.facts} live data sets into ${r.chunks} passages${r.embedded ? `, ${r.embedded} embedded` : ""}.`;
  return r.errors.length ? { error: `${base} Problems: ${r.errors.slice(0, 3).join("; ")}` } : { ok: base };
}

export async function addKnowledgeDocAction(_p: Result, form: FormData): Promise<Result> {
  const admin = await requireUser("configure_system");
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const content = String(form.get("content") ?? "").trim().slice(0, 60_000);
  const url = String(form.get("url") ?? "").trim().slice(0, 300) || null;
  if (title.length < 3 || content.length < 40) return { error: "Give the document a title and at least a few sentences." };
  const cfg = await getAssistantConfig();
  const n = await addDocument(title, content, url, cfg.geminiKey);
  await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.doc_add", entityType: "KnowledgeDoc", entityId: title });
  revalidatePath(PATH);
  return { ok: `Added “${title}” as ${n} passage${n === 1 ? "" : "s"}.` };
}

export async function deleteKnowledgeDocAction(form: FormData) {
  const admin = await requireUser("configure_system");
  const id = String(form.get("id"));
  const doc = await db.knowledgeDoc.delete({ where: { id } });
  invalidateIndex();
  await audit({ actorId: admin.id, actorName: admin.name, action: "assistant.doc_delete", entityType: "KnowledgeDoc", entityId: doc.title });
  revalidatePath(PATH);
}
