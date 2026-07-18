"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BadgeCheck, CalendarClock, Landmark, PenSquare, Handshake,
  Users, Wallet, Ticket, ClipboardCheck, BarChart3, ScrollText, Mail, Settings,
  Briefcase, UserPlus, GraduationCap, Eye, LogOut, Menu, X, Newspaper,
  Globe, ShieldCheck,
} from "lucide-react";
import { useState } from "react";
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

export function PortalShell({
  nav, user, roleLabel, children,
}: { nav: NavItem[]; user: { name: string; email: string }; roleLabel: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/portal/dashboard" && pathname.startsWith(item.href + "/"));
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
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-strong sticky top-0 hidden h-screen w-64 flex-col border-r hairline lg:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="text-sm"><Logo size={34} /></Link>
        </div>
        {NavLinks}
        {UserBlock}
      </aside>

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
      <main className="min-w-0 flex-1 px-5 pb-16 pt-20 md:px-10 lg:pt-8">
        <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">
          <DemoTag>Demo environment — payments & signatures simulated</DemoTag>
        </div>
        {children}
      </main>
    </div>
  );
}
