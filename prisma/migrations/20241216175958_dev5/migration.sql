-- AlterTable
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Orders_Product" (
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("order_id", "product_id"),
    CONSTRAINT "Orders_Product_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Orders_Product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Orders_Product" ("order_id", "product_id", "quantity") SELECT "order_id", "product_id", "quantity" FROM "Orders_Product";
DROP TABLE "Orders_Product";
ALTER TABLE "new_Orders_Product" RENAME TO "Orders_Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
