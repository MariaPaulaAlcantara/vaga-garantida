-- AlterTable: migrate opensHoursBefore/closesHoursBefore to opensDaysBefore/closesAtTime
ALTER TABLE "ConfirmationPolicy" ADD COLUMN "opensDaysBefore" INTEGER;
ALTER TABLE "ConfirmationPolicy" ADD COLUMN "closesAtTime" TEXT;

UPDATE "ConfirmationPolicy"
SET
  "opensDaysBefore" = CASE WHEN "opensHoursBefore" >= 36 THEN 2 ELSE 1 END,
  "closesAtTime" = '20:00';

ALTER TABLE "ConfirmationPolicy" ALTER COLUMN "opensDaysBefore" SET NOT NULL;
ALTER TABLE "ConfirmationPolicy" ALTER COLUMN "opensDaysBefore" SET DEFAULT 1;
ALTER TABLE "ConfirmationPolicy" ALTER COLUMN "closesAtTime" SET NOT NULL;
ALTER TABLE "ConfirmationPolicy" ALTER COLUMN "closesAtTime" SET DEFAULT '20:00';

ALTER TABLE "ConfirmationPolicy" DROP COLUMN "opensHoursBefore";
ALTER TABLE "ConfirmationPolicy" DROP COLUMN "closesHoursBefore";
