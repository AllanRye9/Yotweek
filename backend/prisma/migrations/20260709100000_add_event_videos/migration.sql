-- CreateEnum
CREATE TYPE "EventVideoTiming" AS ENUM ('PAST', 'UPCOMING');

-- CreateEnum
CREATE TYPE "EventVideoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EventVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "timing" "EventVideoTiming" NOT NULL,
    "eventId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "status" "EventVideoStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventVideo_timing_status_isActive_idx" ON "EventVideo"("timing", "status", "isActive");

-- AddForeignKey
ALTER TABLE "EventVideo" ADD CONSTRAINT "EventVideo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVideo" ADD CONSTRAINT "EventVideo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
