-- CreateEnum
CREATE TYPE "MemberRank" AS ENUM ('GUARDA', 'SEGUNDO_CABO', 'PRIMEIRO_CABO', 'SARGENTO', 'SARGENTO_PRINCIPAL', 'SUBINSPECTOR', 'INSPECTOR', 'INSPECTOR_PRINCIPAL', 'ADJUNTO_SUPERINTENDENTE', 'SUPERINTENDENTE', 'SUPERINTENDENTE_PRINCIPAL', 'PRIMEIRO_ADJUNTO_COMISSARIO', 'COMISSARIO', 'INSPECTOR_GERAL');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('ORDEM_PUBLICA', 'INVESTIGACAO_CRIMINAL', 'POLICIA_FRONTEIRAS', 'POLICIA_COSTEIRA', 'POLICIA_TRANSITO', 'UIR', 'UPAI', 'K9', 'CAVALARIA', 'UDEE', 'OPERACOES_ESPECIAIS');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('ESQUADRA', 'COMANDO_DISTRITAL', 'COMANDO_PROVINCIAL', 'DIRECCAO_NACIONAL', 'QUARTEL', 'SUBUNIDADE');

-- CreateEnum
CREATE TYPE "SecurityLevel" AS ENUM ('BASICO', 'INTERMEDIO', 'ALTO', 'MAXIMO');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('OPERACIONAL', 'ADMINISTRATIVO', 'INFORMATIVO', 'FORMACAO', 'SEGURANCA', 'PROMOCOES', 'SOCIAL');

-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PUBLICO', 'DEPARTAMENTO', 'PATENTE_OU_MAIOR', 'UNIDADE', 'RESTRITO');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('OPERACIONAL', 'ADMINISTRATIVO', 'SEGURANCA', 'PROMOCOES', 'FORMACAO', 'ALERTA', 'INFORMACAO', 'SOCIAL');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('NAO_LIDA', 'LIDA', 'ARQUIVADA', 'RESPONDIDA');

-- CreateEnum
CREATE TYPE "NotificationAction" AS ENUM ('VER_DETALHES', 'RESPONDER', 'CONFIRMAR', 'NEGAR', 'MARCAR_COMO_RESOLVIDO', 'ENCAMINHAR', 'NENHUMA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nip" VARCHAR(20) NOT NULL,
    "biNumber" VARCHAR(13) NOT NULL,
    "nuit" VARCHAR(9) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "placeOfBirth" VARCHAR(100) NOT NULL,
    "nationality" VARCHAR(50) NOT NULL DEFAULT 'Moçambicana',
    "maritalStatus" "MaritalStatus" NOT NULL,
    "memberRank" "MemberRank" NOT NULL,
    "currentPosition" VARCHAR(100) NOT NULL,
    "department" "Department" NOT NULL,
    "unit" VARCHAR(100) NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "province" VARCHAR(50) NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "institutionalEmail" VARCHAR(100),
    "officialPhone" VARCHAR(20),
    "passwordHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "securityLevel" "SecurityLevel" NOT NULL DEFAULT 'BASICO',
    "lastAccess" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "PostCategory" NOT NULL,
    "visibility" "VisibilityLevel" NOT NULL,
    "province" VARCHAR(50),
    "unit" VARCHAR(100),
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "name" VARCHAR(200),
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "urgency" "UrgencyLevel" NOT NULL,
    "senderId" TEXT NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmationDeadline" TIMESTAMP(3),
    "availableActions" "NotificationAction"[],
    "status" "NotificationStatus" NOT NULL DEFAULT 'NAO_LIDA',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDepartments" "Department"[],
    "targetRanks" "MemberRank"[],
    "targetProvinces" TEXT[],

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'NAO_LIDA',
    "readAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "response" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationAttachment" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nip_key" ON "User"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "User_biNumber_key" ON "User"("biNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_nuit_key" ON "User"("nuit");

-- CreateIndex
CREATE UNIQUE INDEX "User_institutionalEmail_key" ON "User"("institutionalEmail");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE INDEX "User_memberRank_idx" ON "User"("memberRank");

-- CreateIndex
CREATE INDEX "User_province_idx" ON "User"("province");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "Post"("visibility");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_isPinned_idx" ON "Post"("isPinned");

-- CreateIndex
CREATE INDEX "Post_requiresApproval_idx" ON "Post"("requiresApproval");

-- CreateIndex
CREATE INDEX "MediaAttachment_postId_idx" ON "MediaAttachment"("postId");

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE INDEX "Like_userId_idx" ON "Like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userId_key" ON "Like"("postId", "userId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_postId_userId_key" ON "Bookmark"("postId", "userId");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE INDEX "Notification_urgency_idx" ON "Notification"("urgency");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_requiresConfirmation_idx" ON "Notification"("requiresConfirmation");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_targetDepartments_idx" ON "Notification"("targetDepartments");

-- CreateIndex
CREATE INDEX "Notification_targetRanks_idx" ON "Notification"("targetRanks");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_status_idx" ON "NotificationRecipient"("userId", "status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "NotificationAttachment_notificationId_idx" ON "NotificationAttachment"("notificationId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAttachment" ADD CONSTRAINT "MediaAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationAttachment" ADD CONSTRAINT "NotificationAttachment_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
