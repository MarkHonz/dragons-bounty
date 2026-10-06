-- CreateTable
CREATE TABLE "CustomRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "preferredContact" TEXT,
    "description" TEXT NOT NULL,
    "budget" TEXT,
    "neededBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "userId" TEXT,
    CONSTRAINT "CustomRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");
