-- AlterTable
ALTER TABLE "Cart" ADD COLUMN "discountCode" TEXT;

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "oncePerCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShippingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flatRateInCents" INTEGER NOT NULL,
    "freeOverInCents" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productTotalInCents" INTEGER NOT NULL,
    "shippingTotalInCents" INTEGER,
    "taxTotalInCents" INTEGER,
    "totalInCents" INTEGER NOT NULL,
    "trackingNumber" TEXT,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentIntentId" TEXT,
    "refundedAt" DATETIME,
    "refundedAmountInCents" INTEGER,
    "stripeRefundId" TEXT,
    "shipToName" TEXT,
    "shipToAddress1" TEXT,
    "shipToAddress2" TEXT,
    "shipToCity" TEXT,
    "shipToState" TEXT,
    "shipToZip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "profileId" TEXT NOT NULL,
    "discountInCents" INTEGER NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    CONSTRAINT "Order_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "fulfilled", "id", "productTotalInCents", "profileId", "refundedAmountInCents", "refundedAt", "shipToAddress1", "shipToAddress2", "shipToCity", "shipToName", "shipToState", "shipToZip", "shippingTotalInCents", "stripePaymentIntentId", "stripeRefundId", "taxTotalInCents", "totalInCents", "trackingNumber", "updatedAt") SELECT "createdAt", "fulfilled", "id", "productTotalInCents", "profileId", "refundedAmountInCents", "refundedAt", "shipToAddress1", "shipToAddress2", "shipToCity", "shipToName", "shipToState", "shipToZip", "shippingTotalInCents", "stripePaymentIntentId", "stripeRefundId", "taxTotalInCents", "totalInCents", "trackingNumber", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
