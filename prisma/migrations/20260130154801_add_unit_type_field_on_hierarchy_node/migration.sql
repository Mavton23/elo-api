/*
  Warnings:

  - Added the required column `unitType` to the `hierarchy_nodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hierarchy_nodes" ADD COLUMN     "unitType" "UnitType" NOT NULL;
