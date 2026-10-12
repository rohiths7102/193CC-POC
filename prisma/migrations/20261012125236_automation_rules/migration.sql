-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "autoVerifyAt" TIMESTAMP(3),
ADD COLUMN     "autoVerifyOutcome" TEXT,
ADD COLUMN     "autoVerifyReason" TEXT,
ADD COLUMN     "renewalReminder30At" TIMESTAMP(3),
ADD COLUMN     "renewalReminder7At" TIMESTAMP(3);

-- Automation off-switches (Setting rows, read by src/server/settings.ts).
-- Default ON. Inserted here so they appear on Admin → Settings; an existing
-- row (e.g. a client who already switched one off) is never overwritten.
INSERT INTO "Setting" ("key", "value", "updatedAt") VALUES
  ('automation.org_verify_enabled', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('automation.mentor_assign_enabled', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('automation.renewal_reminders_enabled', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('automation.content_review_reminders_enabled', 'true'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
