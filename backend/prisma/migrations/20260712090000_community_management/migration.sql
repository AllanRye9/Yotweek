-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- AlterTable: Community gains an admin approval gate
ALTER TABLE "Community"
  ADD COLUMN "status" "CommunityStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejectedReason" TEXT;

-- Existing communities (created back when there was no approval gate) stay
-- visible rather than suddenly disappearing behind the new PENDING default.
UPDATE "Community" SET "status" = 'APPROVED';

-- CreateIndex
CREATE INDEX "Community_status_idx" ON "Community"("status");

-- AlterTable: Post gains an optional community link, so a post can be a
-- community announcement/discussion instead of (or in addition to) a
-- general blog post.
ALTER TABLE "Post" ADD COLUMN "communityId" TEXT;

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: matching site-wide approval toggle for communities, alongside
-- the existing requireEventApproval / requireBusinessApproval settings.
ALTER TABLE "PlatformSetting" ADD COLUMN "requireCommunityApproval" BOOLEAN NOT NULL DEFAULT true;
