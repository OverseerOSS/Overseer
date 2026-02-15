-- AlterTable
ALTER TABLE "StatusPage" ADD COLUMN     "config" JSONB,
ADD COLUMN     "showCpu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showNetwork" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showRam" BOOLEAN NOT NULL DEFAULT true;
