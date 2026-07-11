-- AlterTable
ALTER TABLE "Event" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Event_isFeatured_idx" ON "Event"("isFeatured");
