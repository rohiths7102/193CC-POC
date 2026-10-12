"use client";

/**
 * The 193 CC assistant — the chat panel (shared by the public widget and the
 * admin test console) and the floating launcher.
 *
 * Answers stream from /api/assistant: the first line is JSON metadata
 * (session, message id, numbered sources), the rest is text. Citations like
 * [2] in the answer link to the source they name. The conversation persists
 * for the browser session only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageCircle, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";

type Source = { n: number; title: string; url: string | null };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; id?: string; feedback?: 1 | -1; pending?: boolean };

const STORE = "cc193-assistant";
const SUGGESTIONS = [
  "What does membership include?",
  "How does the UK Investors Summit work?",
  "What does Enterprise Investor Ready cost?",
  "How do I attend an event at the House of Lords?",
];

/** The sources the answer actually cites ([n] or 【n…】), one per page, at most four. */
function citedSources(text: string, sources: Source[]): Source[] {
  const cited = new Set([...text.matchAll(/\[(\d+)\]|【(\d+)/g)].map((m) => Number(m[1] ?? m[2])));
  const pool = cited.size ? sources.filter((s) => cited.has(s.n)) : sources.slice(0, 3);
  return pool.filter((s, i, all) => all.findIndex((y) => y.url === s.url) === i).slice(0, 4);
}

/** Light formatting: paragraphs, "- " bullets, **bold**, and [n] citations as links. */
function Rich({ text: raw, sources }: { text: string; sources?: Source[] }) {
  // Normalise model quirks: hidden reasoning, and 【1†L1-L3】-style citations.
  const text = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").replace(/【(\d+)[^】]*】/g, "[$1]").trim();
  const inline = (s: string, key: string) =>
    s.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
      const k = `${key}-${i}`;
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={k} className="font-semibold text-copy">{part.slice(2, -2)}</strong>;
      const cite = part.match(/^\[(\d+)\]$/);
      if (cite) {
        const src = sources?.find((x) => x.n === Number(cite[1]));
        return src?.url ? (
          <Link key={k} href={src.url} className="mx-0.5 align-super font-mono text-[9px] text-accent hover:text-accent-on-night" title={src.title}>
            {cite[1]}
          </Link>
        ) : (
          <sup key={k} className="mx-0.5 font-mono text-[9px] text-accent">{cite[1]}</sup>
        );
      }
      return <span key={k}>{part}</span>;
    });
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="my-2 space-y-1 pl-4">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-accent">{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="my-2 first:mt-0 last:mb-0">{inline(b, String(i))}</p>;
      })}
    </>
  );
}

export function ChatPanel({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inline) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as { msgs: Msg[]; sessionId?: string } | null;
      if (saved?.msgs?.length) { setMsgs(saved.msgs.filter((m) => !m.pending)); setSessionId(saved.sessionId); }
    } catch { /* storage unavailable */ }
    inputRef.current?.focus();
  }, [inline]);

  useEffect(() => {
    if (!inline) { try { sessionStorage.setItem(STORE, JSON.stringify({ msgs, sessionId })); } catch { /* ignore */ } }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, sessionId, inline]);

  const ask = useCallback(async (q: string) => {
    const question = q.trim().slice(0, 2000);
    if (!question || busy) return;
    setError(null);
    setInput("");
    const history = [...msgs.filter((m) => !m.pending && m.content), { role: "user" as const, content: question }];
    setMsgs([...history, { role: "assistant", content: "", pending: true }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, page: window.location.pathname, messages: history.slice(-12).map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "The assistant is unavailable right now.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", meta: { sessionId: string; messageId: string; sources: Source[] } | null = null, text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (!meta) {
          const nl = buf.indexOf("\n");
          if (nl < 0) continue;
          meta = JSON.parse(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
          setSessionId(meta!.sessionId);
        }
        text += buf; buf = "";
        const t = text;
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: t, sources: meta!.sources, id: meta!.messageId, pending: true }]);
      }
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: text, sources: meta?.sources, id: meta?.messageId }]);
    } catch (e) {
      setMsgs((m) => m.slice(0, -1));
      setError((e as Error).message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [busy, msgs, sessionId]);

  const rate = async (i: number, value: 1 | -1) => {
    const m = msgs[i];
    if (!m.id || !sessionId) return;
    setMsgs((all) => all.map((x, j) => (j === i ? { ...x, feedback: value } : x)));
    await fetch("/api/assistant/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: m.id, sessionId, value }) }).catch(() => {});
  };

  const reset = () => { setMsgs([]); setSessionId(undefined); setError(null); };

  return (
    <div className={`flex flex-col overflow-hidden border border-gilt/40 bg-paper/95 text-copy shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md ${inline ? "h-[560px] w-full" : "h-[min(620px,calc(100svh-7rem))] w-[min(400px,calc(100vw-2rem))]"}`}>
      <header className="flex items-center gap-3 border-b border-gilt/25 bg-night/60 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/193cc-logo.png" alt="" width={30} height={30} className="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="font-headline text-lg leading-tight">Ask <em className="text-gilt">193 CC</em></p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-copy-muted">Answers from 193 CC’s own pages</p>
        </div>
        {msgs.length > 0 && (
          <button type="button" onClick={reset} className="flex h-9 w-9 items-center justify-center text-copy-muted hover:text-copy" aria-label="Start a new conversation" title="New conversation">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center text-copy-muted hover:text-copy" aria-label="Close the assistant">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      <div ref={listRef} data-lenis-prevent="" className="flex-1 overflow-y-auto px-4 py-4 text-[14px] leading-[1.6]" aria-live="polite">
        {msgs.length === 0 && (
          <div>
            <p className="text-copy-soft">Good to meet you. Ask about membership, the UK Investors Summit, events at the House of Lords, or how joining works.</p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="border border-gilt/30 px-3 py-2 text-left text-[13px] text-copy-soft transition-colors hover:border-accent hover:text-copy">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="mb-4 flex justify-end">
              <p className="max-w-[85%] bg-chamber/70 px-3 py-2 text-night-copy">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="mb-5">
              {m.pending && !m.content ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted">Searching 193 CC’s pages…</p>
              ) : (
                <Rich text={m.content} sources={m.sources} />
              )}
              {!m.pending && m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {citedSources(m.content, m.sources).map((s) =>
                    s.url ? (
                      <Link key={s.n} href={s.url} className="border border-gilt/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-copy-muted hover:border-accent hover:text-copy">
                        {s.n} · {s.title.replace(/ —.*$| \|.*$/, "").slice(0, 34)}
                      </Link>
                    ) : null,
                  )}
                </div>
              )}
              {!m.pending && m.id && (
                <div className="mt-2 flex items-center gap-1 text-copy-muted">
                  <button type="button" onClick={() => rate(i, 1)} aria-label="Helpful" aria-pressed={m.feedback === 1} className={`flex h-7 w-7 items-center justify-center hover:text-copy ${m.feedback === 1 ? "text-accent" : ""}`}>
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => rate(i, -1)} aria-label="Not helpful" aria-pressed={m.feedback === -1} className={`flex h-7 w-7 items-center justify-center hover:text-copy ${m.feedback === -1 ? "text-accent" : ""}`}>
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ),
        )}
        {error && <p className="mb-3 border border-chamber/60 bg-chamber/20 px-3 py-2 text-[13px] text-copy">{error}</p>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-end gap-2 border-t border-gilt/25 bg-night/40 p-3"
      >
        <label htmlFor="assistant-input" className="sr-only">Your question</label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder="Ask a question…"
          className="max-h-32 min-h-11 flex-1 resize-none border border-gilt/30 bg-paper px-3 py-2.5 text-[14px] text-copy placeholder:text-copy-muted focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center bg-chamber text-night-copy transition-opacity disabled:opacity-40">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
      <p className="bg-night/40 px-3 pb-2 text-center text-[10px] text-copy-muted">AI answers can be wrong — check key details on the linked page.</p>
    </div>
  );
}

/** The floating launcher on public pages. Renders nothing until the server says the assistant is on. */
export function ChatWidget() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/assistant").then((r) => r.json()).then((j: { enabled?: boolean }) => setEnabled(!!j.enabled)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[95] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="193 CC assistant"
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="origin-bottom-right"
          >
            <ChatPanel onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close the assistant" : "Ask 193 CC — open the assistant"}
        className="group flex h-14 items-center gap-3 rounded-full border border-gilt/60 bg-night/90 pl-2 pr-5 text-night-copy shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:border-accent"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chamber">
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </span>
        <span className="font-headline text-lg">Ask <em className="text-gilt">193 CC</em></span>
      </button>
    </div>
  );
}
