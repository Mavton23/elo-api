/*
  Warnings:

  - You are about to alter the column `adminProfileId` on the `admin_permissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(36)`.

*/
-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "admin_permissions" DROP CONSTRAINT "admin_permissions_adminProfileId_fkey";

-- AlterTable
ALTER TABLE "admin_permissions" ALTER COLUMN "adminProfileId" SET DATA TYPE VARCHAR(36);

-- AlterTable
ALTER TABLE "admin_profiles" ADD COLUMN     "adminStatus" "AdminStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "admin_profiles_adminStatus_idx" ON "admin_profiles"("adminStatus");

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_adminProfileId_fkey" FOREIGN KEY ("adminProfileId") REFERENCES "admin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
