-- AlterTable
ALTER TABLE "ServiceMonitor" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceMonitorToStatusPage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "Metric_monitorId_timestamp_idx" ON "Metric"("monitorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_ServiceMonitorToStatusPage_AB_unique" ON "_ServiceMonitorToStatusPage"("A", "B");

-- CreateIndex
CREATE INDEX "_ServiceMonitorToStatusPage_B_index" ON "_ServiceMonitorToStatusPage"("B");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "ServiceMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceMonitorToStatusPage" ADD CONSTRAINT "_ServiceMonitorToStatusPage_A_fkey" FOREIGN KEY ("A") REFERENCES "ServiceMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceMonitorToStatusPage" ADD CONSTRAINT "_ServiceMonitorToStatusPage_B_fkey" FOREIGN KEY ("B") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
