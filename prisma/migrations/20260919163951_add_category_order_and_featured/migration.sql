-- AlterTable
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Give the existing categories positions 0, 1, 2... in the order they were created
UPDATE "Category" SET "sortOrder" = (
  SELECT COUNT(*) FROM "Category" AS "other"
  WHERE "other"."createdAt" < "Category"."createdAt"
     OR ("other"."createdAt" = "Category"."createdAt" AND "other"."id" < "Category"."id")
);
