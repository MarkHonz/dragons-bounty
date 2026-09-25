-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL DEFAULT '',
    "trackingNumber" TEXT,
    "shippedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Orders_Product" (
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL DEFAULT '',
    "variantName" TEXT NOT NULL DEFAULT '',
    "artistId" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("order_id", "product_id", "variant_id"),
    CONSTRAINT "Orders_Product_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Orders_Product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Orders_Product" ("order_id", "priceInCents", "product_id", "quantity", "variantName", "variant_id") SELECT "order_id", "priceInCents", "product_id", "quantity", "variantName", "variant_id" FROM "Orders_Product";
DROP TABLE "Orders_Product";
ALTER TABLE "new_Orders_Product" RENAME TO "Orders_Product";
CREATE INDEX "Orders_Product_artistId_idx" ON "Orders_Product"("artistId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "catagoryId" TEXT NOT NULL,
    "artistId" TEXT,
    CONSTRAINT "Product_catagoryId_fkey" FOREIGN KEY ("catagoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("catagoryId", "createdAt", "description", "id", "isAvailable", "isFeatured", "name", "priceInCents", "quantity", "updatedAt") SELECT "catagoryId", "createdAt", "description", "id", "isAvailable", "isFeatured", "name", "priceInCents", "quantity", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_artistId_idx" ON "Product"("artistId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isArtist" BOOLEAN NOT NULL DEFAULT false,
    "artistName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "password", "role", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Shipment_sellerId_idx" ON "Shipment"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_sellerId_key" ON "Shipment"("orderId", "sellerId");

-- Data: every order already marked shipped becomes one package from the shop,
-- carrying its existing tracking number (Order.trackingNumber is kept as-is).
INSERT INTO "Shipment" ("id", "orderId", "sellerId", "trackingNumber", "shippedAt", "shippedById", "createdAt", "updatedAt")
SELECT 'mig' || lower(hex(randomblob(11))), "id", '', NULLIF(trim("trackingNumber"), ''), "updatedAt", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Order"
WHERE "fulfilled" = 1;
