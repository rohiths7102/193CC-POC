import "server-only";
import { db } from "../db";
import { entitlementLabel } from "@/lib/labels";
import { gbp, ukDate } from "@/lib/utils";
import { geminiEmbed } from "./providers";

/**
 * The knowledge base: build it (index the public pages + live database facts,
 * plus anything an admin added), and search it.
 *
 * Search is hybrid. BM25 over the chunk text always runs; when a Gemini key is
 * configured every chunk also carries an embedding and the query is embedded
 * too, and the two rankings are merged with reciprocal-rank fusion. At this
 * corpus size (hundreds of chunks) scoring in memory is a few milliseconds, so
 * the vectors live in Postgres (Float[]) rather than a separate vector service.
 */

/** Public pages the indexer reads. Portal pages are private and never indexed. */
export const SITE_PAGES = [
  "/", "/summit", "/guides", "/guides/investor-readiness", "/guides/uk-business-membership-compared",
  "/events/house-of-lords", "/join", "/privacy",
];

// ── Chunking ────────────────────────────────────────────────────────────────

/** The last ~n characters of s, starting at a sentence (or failing that, a word) boundary. */
function tail(s: string, n: number): string {
  const t = s.slice(-n);
  const sentence = t.search(/[.!?]\s+[A-Z0-9£“"]/);
  if (sentence >= 0) return t.slice(sentence + 1).trim();
  const space = t.indexOf(" ");
  return space >= 0 ? t.slice(space + 1) : t;
}

export function chunkText(text: string, size = 900, overlap = 150): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > size && cur) {
      chunks.push(cur);
      cur = tail(cur, overlap) + "\n\n" + p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
    while (cur.length > size * 1.6) {
      const cut = cur.lastIndexOf(". ", size) > size / 2 ? cur.lastIndexOf(". ", size) + 1 : size;
      chunks.push(cur.slice(0, cut).trim());
      cur = tail(cur.slice(0, cut), overlap) + " " + cur.slice(cut).trim();
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

// ── Building the site corpus ────────────────────────────────────────────────

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&rsquo;|&lsquo;/g, "’").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&pound;/g, "£").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

/** Readable text of a rendered page's <main>, block elements as paragraph breaks. */
const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

/** Drop every element marked aria-hidden="true" (marquees, decorative repeats), however deeply nested. */
function stripHidden(html: string): string {
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let out = "", last = 0, skipDepth = 0, skipTag = "";
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const [whole, close, name, attrs, selfClose] = m;
    const tag = name.toLowerCase();
    if (!skipDepth) out += html.slice(last, m.index);
    last = m.index + whole.length;
    const isVoid = VOID.has(tag) || selfClose === "/";
    if (skipDepth) {
      if (tag === skipTag && !isVoid) skipDepth += close ? -1 : 1;
      continue;
    }
    if (!close && !isVoid && /aria-hidden="true"/.test(attrs)) { skipDepth = 1; skipTag = tag; continue; }
    out += whole;
  }
  return skipDepth ? out : out + html.slice(last);
}

/** Readable text of a rendered page's <main>, block elements as paragraph breaks. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim()).replace(/\s+[—|-]\s+193 Countries Consortium.*$/, "");
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  const text = decode(
    stripHidden(main.replace(/<(script|style|svg|noscript|template|nav|header|footer)[\s\S]*?<\/\1>/gi, " "))
      .replace(/<\/(p|h[1-6]|li|dt|dd|tr|figcaption|blockquote|section|article|div|button|a)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim();
  // Keep the first copy of any repeated paragraph (marquees, duplicated captions).
  // …and drop navigation crumbs that live inside <main>.
  const seen = new Set<string>(["back to site", "all guides", "skip to content", "read the guide"]);
  const paras = text.split(/\n{2,}/).filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { title, text: paras.join("\n\n") };
}

/** Live facts from the database, written as prose the model can quote. */
async function databaseFacts(): Promise<{ title: string; url: string; content: string }[]> {
  const [products, events] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { entitlements: true } }),
    db.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 10 }),
  ]);
  const billing = (p: (typeof products)[number]) => (p.billing === "ONE_TIME" ? "one-time" : "per year");
  const out = [
    {
      title: "Membership prices — all tiers (live)",
      url: "/join",
      content: `The 193 Countries Consortium offers ${products.length} memberships. Prices are in pounds sterling.\n\n${products
        .map((p) => `${p.name}: ${gbp(p.priceMinor)} ${billing(p)} — ${p.strapline}`)
        .join("\n")}`,
    },
    ...products.map((p) => ({
      title: `${p.name} — price and what it includes (live)`,
      url: `/join/${p.code}`,
      content: `${p.name} costs ${gbp(p.priceMinor)} ${billing(p)}. ${p.strapline}${p.allowsDirectDebit ? " It can be paid by Direct Debit instalments." : ""}\n\nWhat ${p.name} includes:\n${p.entitlements
        .map((e) => `- ${entitlementLabel(e.key, (e.params ?? null) as Record<string, unknown> | null)}`)
        .join("\n")}\n\nJoin at /join/${p.code}`,
    })),
  ];
  if (events.length) {
    out.push({
      title: "Upcoming events (live)",
      url: "/summit",
      content: events.map((e) => `${e.name} — ${e.venue}, ${ukDate(e.startsAt, true)} (${e.kind.toLowerCase().replace(/_/g, " ")}).`).join("\n\n"),
    });
  }
  return out;
}

export type ReindexResult = { pages: number; facts: number; chunks: number; embedded: number; errors: string[] };

/** Rebuild every "site" document. Admin-added documents are kept (and re-embedded if needed). */
export async function reindexSite(origin: string, geminiKey: string | null): Promise<ReindexResult> {
  const errors: string[] = [];
  const docs: { title: string; url: string; content: string }[] = [];

  for (const path of SITE_PAGES) {
    try {
      const res = await fetch(new URL(path, origin), { cache: "no-store", headers: { "user-agent": "193cc-assistant-indexer" } });
      if (!res.ok) { errors.push(`${path}: HTTP ${res.status}`); continue; }
      const { title, text } = htmlToText(await res.text());
      // The homepage's <title> names every section, so as a title it would match everything.
      if (text.length > 80) docs.push({ title: path === "/" ? "Home page" : title || path, url: path, content: text });
    } catch (e) {
      errors.push(`${path}: ${(e as Error).message}`);
    }
  }
  const facts = await databaseFacts();
  docs.push(...facts);

  await db.knowledgeDoc.deleteMany({ where: { source: "site" } });
  let chunks = 0;
  for (const d of docs) {
    const parts = chunkText(d.content);
    await db.knowledgeDoc.create({
      data: { ...d, source: "site", chunks: { create: parts.map((text, ord) => ({ ord, text })) } },
    });
    chunks += parts.length;
  }
  const embedded = await embedMissing(geminiKey, errors);
  invalidateIndex();
  return { pages: docs.length - facts.length, facts: facts.length, chunks, embedded, errors };
}

export async function addDocument(title: string, content: string, url: string | null, geminiKey: string | null) {
  const parts = chunkText(content);
  await db.knowledgeDoc.create({
    data: { title, content, url, source: "admin", chunks: { create: parts.map((text, ord) => ({ ord, text })) } },
  });
  await embedMissing(geminiKey, []);
  invalidateIndex();
  return parts.length;
}

/** Embed every chunk that has no vector yet. No-op without a Gemini key. */
export async function embedMissing(geminiKey: string | null, errors: string[]): Promise<number> {
  if (!geminiKey) return 0;
  const todo = await db.knowledgeChunk.findMany({ where: { embedding: { isEmpty: true } }, select: { id: true, text: true, doc: { select: { title: true } } } });
  if (!todo.length) return 0;
  try {
    const vecs = await geminiEmbed(geminiKey, todo.map((c) => `${c.doc.title}\n${c.text}`), "document");
    for (let i = 0; i < todo.length; i++) {
      if (vecs[i]) await db.knowledgeChunk.update({ where: { id: todo[i].id }, data: { embedding: vecs[i] } });
    }
    return vecs.length;
  } catch (e) {
    errors.push(`embeddings: ${(e as Error).message}`);
    return 0;
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

type IndexedChunk = { id: string; text: string; title: string; url: string | null; terms: Map<string, number>; titleTerms: Set<string>; len: number; vec: number[] | null };
type Index = { chunks: IndexedChunk[]; df: Map<string, number>; avgLen: number; loadedAt: number };
let index: Index | null = null;

export function invalidateIndex() { index = null; }

const STOP = new Set(("a an and are as at be by can do does for from has have how i if in is it its me my of on or our so that the their them there these they this to was we what when where which who why will with you your " +
  "work tell explain about know get want need please like would could should any much many some one also").split(" "));
const stem = (t: string) => {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
};
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((t) => t.length > 1);
export function tokenize(s: string): string[] {
  return words(s).filter((t) => !STOP.has(t)).map(stem);
}
/** Query-side synonyms: visitors say "how much", pages say "price" / "fee" / "£". */
const SYNONYMS: Record<string, string[]> = {
  much: ["price", "cost", "fee", "year"], cost: ["price", "fee"], price: ["cost", "fee"], fee: ["price", "cost"],
  join: ["membership", "enrol"], instalment: ["direct", "debit", "monthly"], member: ["membership"],
  benefit: ["include", "entitlement"], include: ["benefit"], event: ["summit", "reception"],
  cheap: ["price", "cost"], cheapest: ["price", "cost"], expensive: ["price", "cost"], afford: ["price", "cost"],
};
const expand = (query: string) => {
  const raw = words(query).map(stem);
  return [...new Set([...tokenize(query), ...raw.flatMap((t) => (SYNONYMS[t] ?? []).map(stem))])];
};

async function loadIndex(): Promise<Index> {
  if (index && Date.now() - index.loadedAt < 5 * 60_000) return index;
  const rows = await db.knowledgeChunk.findMany({ include: { doc: { select: { title: true, url: true } } } });
  const df = new Map<string, number>();
  const chunks = rows.map((r) => {
    const terms = new Map<string, number>();
    const toks = tokenize(r.text);
    for (const t of toks) terms.set(t, (terms.get(t) ?? 0) + 1);
    for (const t of terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { id: r.id, text: r.text, title: r.doc.title, url: r.doc.url, terms, titleTerms: new Set(tokenize(r.doc.title)), len: toks.length, vec: r.embedding.length ? r.embedding : null };
  });
  const avgLen = chunks.reduce((s, c) => s + c.len, 0) / Math.max(1, chunks.length);
  index = { chunks, df, avgLen, loadedAt: Date.now() };
  return index;
}

const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na * nb) || 1);
};

export type Hit = { id: string; text: string; title: string; url: string | null; score: number };

export async function search(query: string, geminiKey: string | null, k = 6): Promise<{ hits: Hit[]; mode: "hybrid" | "keyword" }> {
  const idx = await loadIndex();
  if (!idx.chunks.length) return { hits: [], mode: "keyword" };

  // BM25
  const asked = [...new Set(tokenize(query))];
  const q = expand(query);
  const N = idx.chunks.length, k1 = 1.4, b = 0.75;
  const bm = idx.chunks.map((c) => {
    let s = 0;
    for (const t of q) {
      const tf = c.terms.get(t); if (!tf) continue;
      const n = idx.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      // Synonyms count for half — the visitor's own words matter most.
      s += (asked.includes(t) ? 1 : 0.5) * idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * c.len) / idx.avgLen)));
    }
    for (const t of asked) {
      if (!c.titleTerms.has(t)) continue;
      const n = idx.df.get(t) ?? 0;
      s += 0.8 * Math.log(1 + (N - n + 0.5) / (n + 0.5));
    }
    return s;
  });

  // Vectors, when available
  let vec: number[] | null = null;
  if (geminiKey && idx.chunks.some((c) => c.vec)) {
    try { [vec] = await geminiEmbed(geminiKey, [query], "query"); } catch { vec = null; }
  }
  const rank = (scores: number[]) => {
    const order = scores.map((s, i) => [s, i] as const).filter(([s]) => s > 0).sort((x, y) => y[0] - x[0]);
    const r = new Map<number, number>(); order.forEach(([, i], pos) => r.set(i, pos + 1)); return r;
  };
  const bmRank = rank(bm);
  const fused = new Map<number, number>();
  for (const [i, r] of bmRank) fused.set(i, 1 / (60 + r));
  if (vec) {
    const vs = idx.chunks.map((c) => (c.vec ? cosine(vec!, c.vec) : 0));
    const vRank = rank(vs.map((s) => (s > 0.35 ? s : 0)));
    for (const [i, r] of vRank) fused.set(i, (fused.get(i) ?? 0) + 1 / (60 + r));
  }
  const hits = [...fused.entries()].sort((x, y) => y[1] - x[1]).slice(0, k)
    .map(([i, score]) => ({ id: idx.chunks[i].id, text: idx.chunks[i].text, title: idx.chunks[i].title, url: idx.chunks[i].url, score }));
  return { hits, mode: vec ? "hybrid" : "keyword" };
}
