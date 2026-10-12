"use client";

import { useActionState } from "react";
import { Button, inputCls } from "@/components/ui";
import {
  addKnowledgeDocAction,
  reindexSiteAction,
  saveAssistantKeyAction,
  saveAssistantSettingsAction,
} from "@/server/actions/assistant";

type Result = { ok?: string; error?: string } | undefined;

function Note({ state }: { state: Result }) {
  if (!state) return null;
  return (
    <p role="status" className={`mt-3 text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function KeyForm({ provider, hint, source }: { provider: "groq" | "gemini"; hint: string | null; source: "env" | "admin" | null }) {
  const [state, action, pending] = useActionState(saveAssistantKeyAction, undefined);
  const label = provider === "groq" ? "Groq API key" : "Gemini API key";
  return (
    <form action={action}>
      <input type="hidden" name="provider" value={provider} />
      <label htmlFor={`key-${provider}`} className="text-xs uppercase tracking-[0.18em] text-mist">{label}</label>
      <p className="mt-1 text-xs text-mist">
        {source === "env" ? <>Set on the host ({hint}) — that value wins over anything saved here.</>
          : source === "admin" ? <>Saved and encrypted ({hint}).</>
          : <>Not set.</>}
      </p>
      <div className="mt-3 flex gap-2">
        <input id={`key-${provider}`} name="key" type="password" autoComplete="off" placeholder={provider === "groq" ? "gsk_…" : "AIza…"} className={inputCls} />
        <Button size="sm" disabled={pending}>{pending ? "Checking…" : "Save"}</Button>
      </div>
      {source === "admin" && (
        <button name="clear" value="true" className="mt-2 text-xs text-mist underline underline-offset-2 hover:text-ivory-100">Remove saved key</button>
      )}
      <Note state={state} />
    </form>
  );
}

export function SettingsForm({ enabled, model, temperature, instructions, models }: {
  enabled: boolean; model: string; temperature: number; instructions: string; models: string[];
}) {
  const [state, action, pending] = useActionState(saveAssistantSettingsAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="a-enabled" className="text-xs uppercase tracking-[0.18em] text-mist">Show on the website</label>
        <select id="a-enabled" name="enabled" defaultValue={String(enabled)} className={`${inputCls} mt-2`}>
          <option value="true">On — visitors see “Ask 193 CC”</option>
          <option value="false">Off — hidden everywhere</option>
        </select>
      </div>
      <div>
        <label htmlFor="a-model" className="text-xs uppercase tracking-[0.18em] text-mist">Model</label>
        {models.length ? (
          <select id="a-model" name="model" defaultValue={model} className={`${inputCls} mt-2`}>
            {!models.includes(model) && <option value={model}>{model} (not offered by this key)</option>}
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input id="a-model" name="model" defaultValue={model} className={`${inputCls} mt-2`} />
        )}
      </div>
      <div>
        <label htmlFor="a-temp" className="text-xs uppercase tracking-[0.18em] text-mist">Creativity (0 = strict, 1 = free)</label>
        <input id="a-temp" name="temperature" type="number" step="0.1" min="0" max="1.5" defaultValue={temperature} className={`${inputCls} mt-2`} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="a-instr" className="text-xs uppercase tracking-[0.18em] text-mist">Extra instructions for the assistant</label>
        <textarea id="a-instr" name="instructions" rows={4} defaultValue={instructions} placeholder="e.g. Always mention that enterprise tiers can be paid in instalments." className={`${inputCls} mt-2`} />
      </div>
      <div className="sm:col-span-2">
        <Button size="sm" disabled={pending}>{pending ? "Saving…" : "Save behaviour"}</Button>
        <Note state={state} />
      </div>
    </form>
  );
}

export function ReindexForm() {
  const [state, action, pending] = useActionState(reindexSiteAction, undefined);
  return (
    <form action={action}>
      <Button size="sm" disabled={pending}>{pending ? "Reading the site…" : "Re-index the website"}</Button>
      <Note state={state} />
    </form>
  );
}

export function AddDocForm() {
  const [state, action, pending] = useActionState(addKnowledgeDocAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="title" required placeholder="Title — e.g. Global Talent visa: what members ask" className={inputCls} />
      <input name="url" placeholder="Link to show as the source (optional) — e.g. /summit" className={inputCls} />
      <textarea name="content" required rows={6} placeholder="Paste the text the assistant should know…" className={inputCls} />
      <Button size="sm" disabled={pending}>{pending ? "Adding…" : "Add to knowledge base"}</Button>
      <Note state={state} />
    </form>
  );
}
