import "server-only";
import { db } from "./db";

/**
 * Off-switches for the rule-based automations. Each is a Setting row edited
 * on Admin → Settings (saveSettingAction). Default ON: a missing row means
 * enabled. Only an explicit `false` (boolean, "false" or 0) switches the
 * automation off and returns that step to the manual staff queue.
 */
export const AUTOMATION = {
  orgVerify: "automation.org_verify_enabled",
  mentorAssign: "automation.mentor_assign_enabled",
  renewalReminders: "automation.renewal_reminders_enabled",
  contentReviewReminders: "automation.content_review_reminders_enabled",
} as const;

export type AutomationKey = (typeof AUTOMATION)[keyof typeof AUTOMATION];

export async function automationEnabled(key: AutomationKey): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return true;
  const v = row.value;
  return !(v === false || v === 0 || (typeof v === "string" && v.trim().toLowerCase() === "false"));
}

/** Actor name stamped on every audit entry an automation writes. */
export const AUTOMATION_ACTOR = "Automation";
