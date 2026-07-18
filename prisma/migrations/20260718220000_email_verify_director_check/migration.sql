-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "chDirectorMatch" BOOLEAN,
ADD COLUMN     "chOfficers" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailCode" TEXT,
ADD COLUMN     "emailCodeExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

