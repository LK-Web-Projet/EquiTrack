/*
  Warnings:

  - You are about to drop the column `camptrack_service_name` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "camptrack_service_name",
ADD COLUMN     "camptrack_service_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "camptrack_service_names" TEXT[] DEFAULT ARRAY[]::TEXT[];
