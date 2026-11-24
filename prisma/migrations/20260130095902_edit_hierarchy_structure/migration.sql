/*
  Warnings:

  - The values [ORDEM_PUBLICA,INVESTIGACAO_CRIMINAL,POLICIA_COSTEIRA,UIR,UPAI,K9,CAVALARIA,UDEE,OPERACOES_ESPECIAIS] on the enum `Department` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `unitType` on the `hierarchy_nodes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "HierarchyNodeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PLANNED', 'UNDER_CONSTRUCTION', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "AboutModuleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AboutModuleCategory" AS ENUM ('CORE', 'ADMIN', 'SOCIAL', 'HIERARCHY', 'HELP', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "Department_new" AS ENUM ('POLICIA_PROTECAO', 'POLICIA_TRANSITO', 'POLICIA_FRONTEIRAS', 'POLICIA_COSTEIRA_LACUSTRE_FLUVIAL', 'POLICIA_CANINA', 'UNIDADE_INTERVENCAO_RAPIDA', 'UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES', 'GRUPO_OPERACOES_ESPECIAIS');
ALTER TABLE "members" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TABLE "User" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TABLE "Notification" ALTER COLUMN "targetDepartments" TYPE "Department_new"[] USING ("targetDepartments"::text::"Department_new"[]);
ALTER TABLE "hierarchy_nodes" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TYPE "Department" RENAME TO "Department_old";
ALTER TYPE "Department_new" RENAME TO "Department";
DROP TYPE "public"."Department_old";
COMMIT;

-- AlterEnum
ALTER TYPE "UnitType" ADD VALUE 'COMPANHIA';

-- AlterTable
ALTER TABLE "hierarchy_nodes" DROP COLUMN "unitType",
ADD COLUMN     "address" VARCHAR(500),
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "jurisdiction" VARCHAR(500),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "municipality" VARCHAR(100),
ADD COLUMN     "operationalHours" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "status" "HierarchyNodeStatus" NOT NULL DEFAULT 'ACTIVE';
