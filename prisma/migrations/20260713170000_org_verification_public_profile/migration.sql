-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "orgDocs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "orgName" TEXT,
ADD COLUMN     "orgNumber" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "profileBio" TEXT,
ADD COLUMN     "profilePublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_profileSlug_key" ON "User"("profileSlug");

