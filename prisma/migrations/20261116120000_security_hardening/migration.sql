-- ELO: endurecimento de segurança
-- tokenVersion permite revogar todos os tokens de um utilizador de imediato.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
