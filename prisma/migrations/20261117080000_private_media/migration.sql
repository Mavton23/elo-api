-- ELO: anexos privados com URLs assinadas e temporárias
ALTER TABLE "MediaAttachment" ADD COLUMN "publicId" VARCHAR(300);
ALTER TABLE "MediaAttachment" ADD COLUMN "resourceType" VARCHAR(10);
ALTER TABLE "MediaAttachment" ADD COLUMN "deliveryType" VARCHAR(20);
ALTER TABLE "MediaAttachment" ADD COLUMN "format" VARCHAR(20);
ALTER TABLE "MediaAttachment" ADD COLUMN "mimeType" VARCHAR(100);
