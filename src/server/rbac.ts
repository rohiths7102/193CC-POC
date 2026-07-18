import type { Role } from "@prisma/client";

/**
 * The client's §4.3 permission matrix, row for row. This is THE authority —
 * every server action checks against it before touching data. UI visibility
 * is derived from it, never the other way round.
 */
export const PERMISSIONS = {
  sign_own_contract:        ["MEMBER"],
  view_own_dashboard:       ["MEMBER", "ADMIN", "SALES_REP"],
  manage_all_memberships:   ["ADMIN"],
  enrol_members:            ["ADMIN", "SALES_REP"],
  apply_discounts:          ["ADMIN", "SALES_REP"],
  view_log_mentoring:       ["MEMBER", "ADMIN", "MENTOR", "CONSULTANT"],
  access_assigned_members:  ["MENTOR", "INVESTOR", "CONSULTANT"],
  view_dealflow:            ["ADMIN", "INVESTOR", "CONSULTANT"],
  book_manage_summit:       ["MEMBER", "ADMIN", "SALES_REP"],
  approve_intent_waitlist:  ["ADMIN", "SALES_REP"],
  submit_edit_content:      ["MEMBER", "ADMIN", "CONSULTANT"],
  approve_publish_content:  ["ADMIN"],
  view_credit_wallet:       ["MEMBER", "ADMIN", "SALES_REP"],
  configure_system:         ["ADMIN"],
  export_reports_audit:     ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Portal home per role — one login page, role decides the destination. */
export const ROLE_HOME: Record<Role, string> = {
  MEMBER: "/portal/dashboard",
  ADMIN: "/portal/admin",
  SALES_REP: "/portal/sales",
  MENTOR: "/portal/mentor",
  INVESTOR: "/portal/investor",
  CONSULTANT: "/portal/consultant",
};
