-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "AdminModule" AS ENUM ('USERS', 'HIERARCHY', 'MEMBERS', 'NOTIFICATIONS', 'SYSTEM', 'LOGS', 'SETTINGS');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SECURITY');

-- CreateEnum
CREATE TYPE "ActivityModule" AS ENUM ('AUTH', 'USERS', 'HIERARCHY', 'NOTIFICATIONS', 'SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('USER', 'NODE', 'MEMBER', 'NOTIFICATION', 'SYSTEM', 'POST', 'COMMENT');

-- CreateEnum
CREATE TYPE "SettingsCategory" AS ENUM ('GENERAL', 'SECURITY', 'NOTIFICATIONS', 'BACKUP', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SettingsType" AS ENUM ('BOOLEAN', 'NUMBER', 'STRING', 'SELECT', 'JSON');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UnitType" ADD VALUE 'DEPARTAMENTO';
ALTER TYPE "UnitType" ADD VALUE 'SECCAO';

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminLevel" "AdminLevel" NOT NULL,
    "adminSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAdminActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "adminProfileId" TEXT NOT NULL,
    "module" "AdminModule" NOT NULL,
    "actions" "AdminAction"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "level" "ActivityLevel" NOT NULL,
    "module" "ActivityModule" NOT NULL,
    "action" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "userName" VARCHAR(200),
    "userRole" VARCHAR(50),
    "targetType" "TargetType",
    "targetId" TEXT,
    "targetName" VARCHAR(200),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" "SettingsCategory" NOT NULL,
    "type" "SettingsType" NOT NULL,
    "value" JSONB NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hierarchy_nodes" (
    "id" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "parentId" TEXT,
    "department" "Department",
    "province" VARCHAR(50),
    "unitType" "UnitType",
    "commanderId" TEXT,
    "data" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "hierarchy_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HierarchyMembership" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HierarchyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_userId_key" ON "admin_profiles"("userId");

-- CreateIndex
CREATE INDEX "admin_profiles_adminLevel_idx" ON "admin_profiles"("adminLevel");

-- CreateIndex
CREATE INDEX "admin_profiles_adminSince_idx" ON "admin_profiles"("adminSince");

-- CreateIndex
CREATE INDEX "admin_permissions_module_idx" ON "admin_permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_adminProfileId_module_key" ON "admin_permissions"("adminProfileId", "module");

-- CreateIndex
CREATE INDEX "activity_logs_level_idx" ON "activity_logs"("level");

-- CreateIndex
CREATE INDEX "activity_logs_module_idx" ON "activity_logs"("module");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_targetType_targetId_idx" ON "activity_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_ipAddress_idx" ON "activity_logs"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_name_key" ON "system_settings"("name");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE INDEX "system_settings_type_idx" ON "system_settings"("type");

-- CreateIndex
CREATE INDEX "system_settings_order_idx" ON "system_settings"("order");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_nodes_code_key" ON "hierarchy_nodes"("code");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_type_idx" ON "hierarchy_nodes"("type");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_parentId_idx" ON "hierarchy_nodes"("parentId");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_department_idx" ON "hierarchy_nodes"("department");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_province_idx" ON "hierarchy_nodes"("province");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_isActive_idx" ON "hierarchy_nodes"("isActive");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_commanderId_idx" ON "hierarchy_nodes"("commanderId");

-- CreateIndex
CREATE INDEX "hierarchy_nodes_code_idx" ON "hierarchy_nodes"("code");

-- CreateIndex
CREATE INDEX "HierarchyMembership_userId_idx" ON "HierarchyMembership"("userId");

-- CreateIndex
CREATE INDEX "HierarchyMembership_nodeId_idx" ON "HierarchyMembership"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "HierarchyMembership_nodeId_userId_key" ON "HierarchyMembership"("nodeId", "userId");

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_adminProfileId_fkey" FOREIGN KEY ("adminProfileId") REFERENCES "admin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_nodes" ADD CONSTRAINT "hierarchy_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "hierarchy_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_nodes" ADD CONSTRAINT "hierarchy_nodes_commanderId_fkey" FOREIGN KEY ("commanderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_nodes" ADD CONSTRAINT "hierarchy_nodes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_nodes" ADD CONSTRAINT "hierarchy_nodes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HierarchyMembership" ADD CONSTRAINT "HierarchyMembership_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "hierarchy_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HierarchyMembership" ADD CONSTRAINT "HierarchyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
