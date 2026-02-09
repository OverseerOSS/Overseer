-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstalledExtension" (
    "id" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "config" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstalledExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMonitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "InstalledExtension_extensionId_key" ON "InstalledExtension"("extensionId");
