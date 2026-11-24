/*
  Warnings:

  - Added the required column `publicId` to the `help_attachments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "help_attachments" ADD COLUMN     "publicId" VARCHAR(500) NOT NULL;
