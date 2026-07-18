import { requireUser } from "@/server/auth";
import { PortalShell, type NavItem } from "@/components/sidebar";
import { titleCase } from "@/lib/utils";

const NAV: Record<string, NavItem[]> = {
  MEMBER: [
    { href: "/portal/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/portal/membership", label: "Membership & wallet", icon: "membership" },
    { href: "/portal/mentoring", label: "Mentoring", icon: "mentoring" },
    { href: "/portal/summit", label: "Summit", icon: "summit" },
    { href: "/portal/content", label: "Article & video", icon: "content" },
    { href: "/portal/pitch", label: "Investor pitch", icon: "pitch" },
    { href: "/portal/profile", label: "Public profile", icon: "profile" },
    { href: "/portal/news", label: "News & networking", icon: "news" },
  ],
  ADMIN: [
    { href: "/portal/admin", label: "Overview", icon: "overview" },
    { href: "/portal/admin/verification", label: "Verification", icon: "verification" },
    { href: "/portal/admin/members", label: "Members", icon: "members" },
    { href: "/portal/admin/payments", label: "Payments & wallet", icon: "payments" },
    { href: "/portal/admin/summit", label: "Summit console", icon: "summit-console" },
    { href: "/portal/admin/dealflow", label: "Deal-flow", icon: "dealflow" },
    { href: "/portal/admin/approvals", label: "Approvals", icon: "approvals" },
    { href: "/portal/admin/reports", label: "Reports", icon: "reports" },
    { href: "/portal/admin/audit", label: "Audit log", icon: "audit" },
    { href: "/portal/admin/emails", label: "Email log", icon: "emails" },
    { href: "/portal/admin/settings", label: "Settings", icon: "settings" },
  ],
  SALES_REP: [
    { href: "/portal/sales", label: "Pipeline", icon: "pipeline" },
    { href: "/portal/admin/verification", label: "Verification", icon: "verification" },
    { href: "/portal/sales/enrol", label: "Manual enrolment", icon: "enrol" },
  ],
  MENTOR: [{ href: "/portal/mentor", label: "My members", icon: "sessions" }],
  INVESTOR: [{ href: "/portal/investor", label: "Deal-flow", icon: "dealflow" }],
  CONSULTANT: [
    { href: "/portal/consultant", label: "My members", icon: "sessions" },
    { href: "/portal/consultant/articles", label: "Article drafts", icon: "content" },
  ],
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <PortalShell
      nav={NAV[user.role] ?? []}
      user={{ name: user.name, email: user.email }}
      roleLabel={titleCase(user.role)}
    >
      {children}
    </PortalShell>
  );
}
