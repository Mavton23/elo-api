/*
  Warnings:

  - The values [POLICIA_CANINA] on the enum `Department` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Department_new" AS ENUM ('POLICIA_PROTECAO', 'POLICIA_TRANSITO', 'POLICIA_FRONTEIRAS', 'POLICIA_COSTEIRA_LACUSTRE_FLUVIAL', 'UNIDADE_CANINA', 'UNIDADE_INTERVENCAO_RAPIDA', 'UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES', 'GRUPO_OPERACOES_ESPECIAIS');
ALTER TABLE "members" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TABLE "User" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TABLE "Notification" ALTER COLUMN "targetDepartments" TYPE "Department_new"[] USING ("targetDepartments"::text::"Department_new"[]);
ALTER TABLE "hierarchy_nodes" ALTER COLUMN "department" TYPE "Department_new" USING ("department"::text::"Department_new");
ALTER TYPE "Department" RENAME TO "Department_old";
ALTER TYPE "Department_new" RENAME TO "Department";
DROP TYPE "public"."Department_old";
COMMIT;
