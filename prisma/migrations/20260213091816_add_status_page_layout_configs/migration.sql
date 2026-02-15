-- AlterTable
ALTER TABLE "StatusPage" ADD COLUMN     "showBanner" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showHistory" BOOLEAN NOT NULL DEFAULT true;
