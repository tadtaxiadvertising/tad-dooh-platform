-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "processing_status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "validation_error" TEXT;
