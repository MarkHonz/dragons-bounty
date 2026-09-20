-- CreateTable
CREATE TABLE "AuthAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AuthAttempt_kind_subject_createdAt_idx" ON "AuthAttempt"("kind", "subject", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_kind_ip_createdAt_idx" ON "AuthAttempt"("kind", "ip", "createdAt");
