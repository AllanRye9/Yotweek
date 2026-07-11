-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'Yotweek',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@yotweek.com',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "announcementBanner" TEXT,
    "requireEventApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireBusinessApproval" BOOLEAN NOT NULL DEFAULT true,
    "defaultCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "autoApproveVerified" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);
