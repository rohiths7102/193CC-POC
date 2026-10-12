import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { GlassCard, Badge, Button } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { getAssistantConfig, keyHint } from "@/server/assistant/config";
import { groqModels } from "@/server/assistant/providers";
import { deleteKnowledgeDocAction } from "@/server/actions/assistant";
import { ChatPanel } from "@/components/assistant/chat";
import { AddDocForm, KeyForm, ReindexForm, SettingsForm } from "@/components/assistant/admin-forms";
import { ukDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
// Re-indexing reads every public page; give the server action room.
export const maxDuration = 60;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export default async function AssistantAdminPage() {
  await requireUser("configure_system");
  const cfg = await getAssistantConfig();
  const weekAgo = daysAgo(7);

  const [docs, chunkCount, embeddedCount, sessions, weekQuestions, rated] = await Promise.all([
    db.knowledgeDoc.findMany({ orderBy: [{ source: "asc" }, { title: "asc" }], include: { _count: { select: { chunks: true } } } }),
    db.knowledgeChunk.count(),
    db.knowledgeChunk.count({ where: { NOT: { embedding: { isEmpty: true } } } }),
    db.chatSession.findMany({
      orderBy: { createdAt: "desc" }, take: 25,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    db.chatMessage.count({ where: { role: "user", createdAt: { gte: weekAgo } } }),
    db.chatMessage.groupBy({ by: ["feedback"], where: { feedback: { not: null } }, _count: true }),
  ]);
  let models: string[] = [];
  if (cfg.groqKey) { try { models = await groqModels(cfg.groqKey); } catch { models = []; } }

  const up = rated.find((r) => r.feedback === 1)?._count ?? 0;
  const down = rated.find((r) => r.feedback === -1)?._count ?? 0;
  const live = cfg.enabled && !!cfg.groqKey;

  return (
    <PageFx>
      <h1 className="font-headline text-4xl text-ivory-50 md:text-5xl">AI assistant</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-mist">
        “Ask 193 CC” answers visitors from the site’s own pages and live membership data (retrieval-augmented generation).
        Answers are written by Groq; search is keyword (BM25) and — once a Gemini key is added — semantic vectors as well.
      </p>

      {/* Status */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">On the website</p>
          <p className="mt-2 flex items-center gap-2 text-lg text-ivory-50">{live ? <Badge tone="green">Live</Badge> : <Badge tone="red">Off</Badge>}</p>
          <p className="mt-2 text-xs text-mist">{!cfg.groqKey ? "Add a Groq key to switch it on." : cfg.enabled ? cfg.model : "Switched off below."}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Search</p>
          <p className="mt-2 text-lg text-ivory-50">{cfg.geminiKey && embeddedCount ? "Hybrid · vectors + BM25" : "Keyword · BM25"}</p>
          <p className="mt-2 text-xs text-mist">{embeddedCount}/{chunkCount} passages embedded</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Knowledge base</p>
          <p className="mt-2 text-lg text-ivory-50">{docs.length} documents</p>
          <p className="mt-2 text-xs text-mist">{chunkCount} passages</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Last 7 days</p>
          <p className="mt-2 text-lg text-ivory-50">{weekQuestions} questions</p>
          <p className="mt-2 text-xs text-mist">{up} helpful · {down} not helpful (all time)</p>
        </GlassCard>
      </div>

      {/* Keys + behaviour */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-6 p-6">
          <h2 className="font-headline text-2xl text-ivory-50">Keys</h2>
          <KeyForm provider="groq" hint={keyHint(cfg.groqKey)} source={cfg.groqKeySource} />
          <KeyForm provider="gemini" hint={keyHint(cfg.geminiKey)} source={cfg.geminiKeySource} />
          <p className="text-xs leading-5 text-mist">
            Groq keys: console.groq.com → API Keys. Gemini keys (free tier, used only for search vectors): aistudio.google.com → Get API key.
            Keys are checked, then stored encrypted; they are never shown again or sent to the browser.
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-4 font-headline text-2xl text-ivory-50">Behaviour</h2>
          <SettingsForm enabled={cfg.enabled} model={cfg.model} temperature={cfg.temperature} instructions={cfg.instructions} models={models} />
        </GlassCard>
      </div>

      {/* Knowledge base */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-headline text-2xl text-ivory-50">Knowledge base</h2>
            <ReindexForm />
          </div>
          <p className="mt-2 text-xs text-mist">Re-indexing reads the public pages and the live tiers, prices and events. Run it after content changes.</p>
          <ul className="mt-5 divide-y divide-line">
            {docs.length === 0 && <li className="py-3 text-sm text-mist">Empty — press “Re-index the website”.</li>}
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ivory-50">{d.title}</span>
                  <span className="text-xs text-mist">{d.source === "site" ? "Website" : "Added by staff"} · {d._count.chunks} passages{d.url ? ` · ${d.url}` : ""} · {ukDate(d.updatedAt)}</span>
                </span>
                {d.source === "admin" && (
                  <form action={deleteKnowledgeDocAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button size="sm" variant="ghost">Delete</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-1 font-headline text-2xl text-ivory-50">Teach it something</h2>
          <p className="mb-4 text-xs text-mist">FAQs, event briefings, policies — anything visitors ask that isn’t on the site yet.</p>
          <AddDocForm />
        </GlassCard>
      </div>

      {/* Try it + conversations */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-headline text-2xl text-ivory-50">Try it</h2>
          {live ? <ChatPanel inline /> : <GlassCard className="p-6 text-sm text-mist">Add a Groq key and switch the assistant on to test it here.</GlassCard>}
        </div>
        <div>
          <h2 className="mb-3 font-headline text-2xl text-ivory-50">Recent conversations</h2>
          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1" data-lenis-prevent="">
            {sessions.length === 0 && <GlassCard className="p-6 text-sm text-mist">No conversations yet.</GlassCard>}
            {sessions.map((s) => (
              <GlassCard key={s.id} className="p-4 text-sm">
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{ukDate(s.createdAt, true)}{s.page ? ` · from ${s.page}` : ""}</p>
                {s.messages.map((m) => (
                  <div key={m.id} className="mt-2">
                    <p className={m.role === "user" ? "text-ivory-50" : "text-ivory-200"}>
                      <span className="mr-2 font-mono text-[10px] uppercase text-gold-400">{m.role === "user" ? "Q" : "A"}</span>
                      {m.content.length > 400 ? `${m.content.slice(0, 400)}…` : m.content || "(no answer)"}
                    </p>
                    {m.feedback != null && <p className="mt-1 text-xs">{m.feedback > 0 ? <Badge tone="green">Helpful</Badge> : <Badge tone="red">Not helpful</Badge>}</p>}
                  </div>
                ))}
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </PageFx>
  );
}
