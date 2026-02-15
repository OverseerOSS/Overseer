/*
  Warnings:

  - You are about to drop the column `extensionId` on the `ServiceMonitor` table. All the data in the column will be lost.
  - You are about to drop the `InstalledExtension` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceMonitor" DROP COLUMN "extensionId",
ALTER COLUMN "config" SET DEFAULT '{}',
ALTER COLUMN "type" SET DEFAULT 'http';

-- DropTable
DROP TABLE "InstalledExtension";
