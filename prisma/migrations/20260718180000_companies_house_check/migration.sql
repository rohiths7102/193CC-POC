-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "chCheckedAt" TIMESTAMP(3),
ADD COLUMN     "chIncorporatedAt" TIMESTAMP(3),
ADD COLUMN     "chNameMatches" BOOLEAN,
ADD COLUMN     "chOfficialName" TEXT,
ADD COLUMN     "chSimulated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chStatus" TEXT;

