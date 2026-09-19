-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER,
    "quantity" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckoutSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentIntentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cart_Products" (
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,

    PRIMARY KEY ("cart_id", "product_id", "variant_id"),
    CONSTRAINT "Cart_Products_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cart_Products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Cart_Products" ("cart_id", "product_id", "quantity") SELECT "cart_id", "product_id", "quantity" FROM "Cart_Products";
DROP TABLE "Cart_Products";
ALTER TABLE "new_Cart_Products" RENAME TO "Cart_Products";
CREATE TABLE "new_Orders_Product" (
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL DEFAULT '',
    "variantName" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("order_id", "product_id", "variant_id"),
    CONSTRAINT "Orders_Product_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Orders_Product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Orders_Product" ("order_id", "priceInCents", "product_id", "quantity") SELECT "order_id", "priceInCents", "product_id", "quantity" FROM "Orders_Product";
DROP TABLE "Orders_Product";
ALTER TABLE "new_Orders_Product" RENAME TO "Orders_Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSnapshot_paymentIntentId_key" ON "CheckoutSnapshot"("paymentIntentId");

-- CreateIndex
CREATE INDEX "CheckoutSnapshot_createdAt_idx" ON "CheckoutSnapshot"("createdAt");

