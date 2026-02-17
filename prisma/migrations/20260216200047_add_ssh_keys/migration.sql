-- CreateTable
CREATE TABLE "SshKey" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SshKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SshKey_monitorId_key" ON "SshKey"("monitorId");

-- AddForeignKey
ALTER TABLE "SshKey" ADD CONSTRAINT "SshKey_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "ServiceMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
