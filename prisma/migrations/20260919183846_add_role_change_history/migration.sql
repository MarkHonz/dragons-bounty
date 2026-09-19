-- CreateTable
CREATE TABLE "RoleChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromRole" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "targetName" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorName" TEXT,
    "targetId" TEXT,
    "actorId" TEXT,
    CONSTRAINT "RoleChange_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RoleChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RoleChange_createdAt_idx" ON "RoleChange"("createdAt");
