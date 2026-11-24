-- ELO: serviços ao efetivo (prova de vida e atualização de dados)

-- Novos contactos no perfil
ALTER TABLE "User" ADD COLUMN "personalPhone" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN "residentialAddress" VARCHAR(300);
ALTER TABLE "User" ADD COLUMN "emergencyContactName" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN "emergencyContactPhone" VARCHAR(20);

CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO');

CREATE TABLE "life_proof_campaigns" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetDepartments" "Department"[],
    "targetProvinces" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "life_proof_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "life_proofs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "challengeCode" VARCHAR(10) NOT NULL,
    "selfiePublicId" VARCHAR(300) NOT NULL,
    "selfieFormat" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "devicePlatform" VARCHAR(20),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" VARCHAR(500),
    CONSTRAINT "life_proofs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_update_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "justification" VARCHAR(1000),
    "documentPublicId" VARCHAR(300),
    "documentResourceType" VARCHAR(10),
    "documentFormat" VARCHAR(20),
    "documentName" VARCHAR(200),
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "data_update_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "life_proof_campaigns_isActive_startsAt_endsAt_idx" ON "life_proof_campaigns"("isActive", "startsAt", "endsAt");
CREATE INDEX "life_proofs_userId_submittedAt_idx" ON "life_proofs"("userId", "submittedAt");
CREATE INDEX "life_proofs_campaignId_status_idx" ON "life_proofs"("campaignId", "status");
CREATE INDEX "life_proofs_status_idx" ON "life_proofs"("status");
CREATE INDEX "data_update_requests_userId_createdAt_idx" ON "data_update_requests"("userId", "createdAt");
CREATE INDEX "data_update_requests_status_createdAt_idx" ON "data_update_requests"("status", "createdAt");

ALTER TABLE "life_proof_campaigns" ADD CONSTRAINT "life_proof_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "life_proofs" ADD CONSTRAINT "life_proofs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "life_proofs" ADD CONSTRAINT "life_proofs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "life_proof_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "life_proofs" ADD CONSTRAINT "life_proofs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_update_requests" ADD CONSTRAINT "data_update_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_update_requests" ADD CONSTRAINT "data_update_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
