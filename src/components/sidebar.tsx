"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  LayoutDashboard, BadgeCheck, CalendarClock, Landmark, PenSquare, Handshake,
  Users, Wallet, Ticket, ClipboardCheck, BarChart3, ScrollText, Mail, Settings,
  Briefcase, UserPlus, GraduationCap, Eye, LogOut, Menu, X, Newspaper,
  Globe, ShieldCheck, Search, CornerDownLeft,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, DemoTag } from "@/components/ui";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/server/actions/public";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  membership: <BadgeCheck className="h-4 w-4" />,
  mentoring: <CalendarClock className="h-4 w-4" />,
  summit: <Landmark className="h-4 w-4" />,
  content: <PenSquare className="h-4 w-4" />,
  pitch: <Handshake className="h-4 w-4" />,
  overview: <LayoutDashboard className="h-4 w-4" />,
  members: <Users className="h-4 w-4" />,
  payments: <Wallet className="h-4 w-4" />,
  "summit-console": <Ticket className="h-4 w-4" />,
  approvals: <ClipboardCheck className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
  audit: <ScrollText className="h-4 w-4" />,
  emails: <Mail className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  pipeline: <Briefcase className="h-4 w-4" />,
  enrol: <UserPlus className="h-4 w-4" />,
  sessions: <GraduationCap className="h-4 w-4" />,
  dealflow: <Eye className="h-4 w-4" />,
  news: <Newspaper className="h-4 w-4" />,
  profile: <Globe className="h-4 w-4" />,
  verification: <ShieldCheck className="h-4 w-4" />,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

/** ⌘K command palette — instant keyboard navigation across the console.
 *  The signature move of premium dashboards (Linear, Vercel, Stripe). */
function CommandPalette({ nav, open, onClose }: { nav: NavItem[]; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const items = useMemo(
    () => nav.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())),
    [nav, q]
  );

  useEffect(() => {
    if (open) {
      // Remember the invoker so Escape/backdrop return focus where it came from.
      restoreRef.current = document.activeElement as HTMLElement | null;
      setQ(""); setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    restoreRef.current?.focus?.();
  }, [open]);
  useEffect(() => setSel(0), [q]);

  const go = (href: string) => { onClose(); router.push(href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-ink-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Command palette"
            className="glass-strong mx-auto mt-[16vh] w-[min(560px,92vw)] overflow-hidden rounded-2xl shadow-lift ring-1 ring-gold-500/25"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // Single-input modal: Tab must not wander into the obscured page.
              if (e.key === "Tab") { e.preventDefault(); inputRef.current?.focus(); }
            }}
          >
            <div className="flex items-center gap-3 border-b hairline px-5 py-4">
              <Search className="h-4 w-4 shrink-0 text-gold-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                role="combobox"
                aria-expanded="true"
                aria-controls="cc-palette-list"
                aria-activedescendant={items[sel] ? `cc-palette-opt-${sel}` : undefined}
                aria-label="Search console destinations"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                  if (e.key === "Enter" && items[sel]) go(items[sel].href);
                }}
                placeholder="Where to?"
                className="w-full bg-transparent text-sm text-ivory-100 placeholder:text-mist/60 focus:outline-none"
              />
              <kbd className="rounded-md border hairline px-1.5 py-0.5 text-[10px] text-mist">esc</kbd>
            </div>
            <ul id="cc-palette-list" role="listbox" aria-label="Destinations" className="max-h-[42vh] overflow-y-auto p-2" data-lenis-prevent>
              {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-mist" role="presentation">Nothing matches.</li>}
              {items.map((item, i) => (
                <li key={item.href} role="option" id={`cc-palette-opt-${i}`} aria-selected={i === sel}>
                  <button
                    tabIndex={-1}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setSel(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors",
                      i === sel ? "bg-gold-500/12 text-ivory-50 ring-1 ring-gold-500/30" : "text-mist"
                    )}
                  >
                    <span className={cn(i === sel ? "text-gold-400" : "text-mist")}>{ICONS[item.icon]}</span>
                    <span className="flex-1">{item.label}</span>
                    {i === sel && <CornerDownLeft className="h-3.5 w-3.5 text-gold-500/70" />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">
              {items.length === 0 ? "No results" : `${items.length} result${items.length === 1 ? "" : "s"}, ${items[sel]?.label ?? ""} selected`}
            </p>
            <div className="flex items-center gap-4 border-t hairline px-5 py-2.5 text-[10px] uppercase tracking-widest text-mist/60">
              <span>↑↓ navigate</span><span>↵ open</span><span className="ml-auto">193CC Console</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PortalShell({
  nav, user, roleLabel, children,
}: { nav: NavItem[]; user: { name: string; email: string }; roleLabel: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // SSR renders the Windows/Linux hint; Macs swap after mount (hydration-safe).
  const [modKey, setModKey] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iP(hone|ad|od)/.test(navigator.platform)) setModKey("⌘");
  }, []);

  // Device tiering for the console too — same flag the public shell sets.
  useEffect(() => {
    if ((navigator.hardwareConcurrency ?? 8) <= 4) {
      document.documentElement.classList.add("low-power");
    }
  }, []);

  // ⌘K / Ctrl+K opens the palette from anywhere in the portal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Longest-prefix match → exactly ONE item is ever active (fixes the root
  // item lighting up alongside its children on sub-pages).
  const activeHref = nav
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const NavLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
              active ? "text-ivory-50" : "text-mist hover:text-ivory-100 hover:bg-ink-700/40"
            )}>
            {active && (
              <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-gold-500/12 ring-1 ring-gold-500/30"
                transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            <span className={cn("relative z-10", active && "text-gold-400")}>{ICONS[item.icon]}</span>
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const UserBlock = (
    <div className="border-t hairline p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ivory-50">{user.name}</p>
          <p className="truncate text-[11px] text-mist">{roleLabel}</p>
        </div>
        <form action={logoutAction}>
          <button title="Sign out" className="rounded-lg p-2 text-mist transition-colors hover:bg-ink-700/60 hover:text-ivory-100">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-strong sticky top-0 hidden h-screen w-64 flex-col border-r hairline lg:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="text-sm"><Logo size={34} /></Link>
        </div>
        <div className="px-3 pb-1">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border hairline bg-ink-800/50 px-3.5 py-2 text-left text-xs text-mist transition-colors hover:border-gold-500/40 hover:text-ivory-100"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1">Jump to…</span>
            <kbd aria-label={`${modKey === "⌘" ? "Command" : "Control"} plus K`} className="rounded-md border hairline px-1.5 py-0.5 text-[10px]">{modKey} K</kbd>
          </button>
        </div>
        {NavLinks}
        {UserBlock}
      </aside>

      <CommandPalette nav={nav} open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b hairline bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="text-xs"><Logo size={28} /></Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-ivory-100">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <motion.div initial={{ x: -280 }} animate={{ x: 0 }} className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-strong lg:hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-display text-ivory-50">Menu</span>
            <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-mist" /></button>
          </div>
          {NavLinks}
          {UserBlock}
        </motion.div>
      )}

      {/* Content */}
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 pb-16 pt-20 md:px-10 lg:pt-8">
        <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">
          <DemoTag>Demo environment — payments & signatures simulated</DemoTag>
        </div>
        {children}
      </main>
    </div>
    </MotionConfig>
  );
}
