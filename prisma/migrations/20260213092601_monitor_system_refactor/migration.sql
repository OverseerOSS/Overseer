-- AlterTable
ALTER TABLE "ServiceMonitor" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "lastStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "method" TEXT DEFAULT 'GET',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'extension',
ADD COLUMN     "url" TEXT,
ALTER COLUMN "extensionId" DROP NOT NULL;
