-- Respostas a comunicados podem ter texto livre (até 500 caracteres).
ALTER TABLE "NotificationRecipient" ALTER COLUMN "response" TYPE VARCHAR(500);
