-- CreateTable
CREATE TABLE "ArtistChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "fromName" TEXT,
    "toName" TEXT,
    "targetId" TEXT,
    "targetEmail" TEXT NOT NULL,
    "targetName" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorName" TEXT,
    CONSTRAINT "ArtistChange_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ArtistChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ArtistChange_createdAt_idx" ON "ArtistChange"("createdAt");
