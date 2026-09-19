-- AlterTable
ALTER TABLE "Order" ADD COLUMN "refundedAmountInCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN "refundedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "stripeRefundId" TEXT;
