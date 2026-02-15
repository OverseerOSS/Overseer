-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'discord',
    "config" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NotificationChannelToServiceMonitor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_NotificationChannelToServiceMonitor_AB_unique" ON "_NotificationChannelToServiceMonitor"("A", "B");

-- CreateIndex
CREATE INDEX "_NotificationChannelToServiceMonitor_B_index" ON "_NotificationChannelToServiceMonitor"("B");

-- AddForeignKey
ALTER TABLE "_NotificationChannelToServiceMonitor" ADD CONSTRAINT "_NotificationChannelToServiceMonitor_A_fkey" FOREIGN KEY ("A") REFERENCES "NotificationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NotificationChannelToServiceMonitor" ADD CONSTRAINT "_NotificationChannelToServiceMonitor_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
