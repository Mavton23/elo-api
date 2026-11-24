-- CreateEnum
CREATE TYPE "UserSettingCategory" AS ENUM ('NOTIFICATIONS', 'PRIVACY', 'SECURITY', 'APPEARANCE', 'ACCOUNT', 'PREFERENCES', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UserSettingType" AS ENUM ('BOOLEAN', 'NUMBER', 'STRING', 'SELECT', 'JSON', 'ARRAY');

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "category" "UserSettingCategory" NOT NULL,
    "type" "UserSettingType" NOT NULL,
    "value" JSONB NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "minValue" JSONB,
    "maxValue" JSONB,
    "regex" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastModifiedAt" TIMESTAMP(3),

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting_history" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "changedBy" TEXT,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_setting_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_settings_userId_idx" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "user_settings_category_idx" ON "user_settings"("category");

-- CreateIndex
CREATE INDEX "user_settings_key_idx" ON "user_settings"("key");

-- CreateIndex
CREATE INDEX "user_settings_userId_category_idx" ON "user_settings"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key_key" ON "user_settings"("userId", "key");

-- CreateIndex
CREATE INDEX "user_setting_history_settingId_idx" ON "user_setting_history"("settingId");

-- CreateIndex
CREATE INDEX "user_setting_history_createdAt_idx" ON "user_setting_history"("createdAt");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting_history" ADD CONSTRAINT "user_setting_history_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "user_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
