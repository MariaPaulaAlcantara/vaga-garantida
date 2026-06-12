-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "confirmationReminderSentAt" TIMESTAMP(3);
ALTER TABLE "EventRegistration" ADD COLUMN "lastNotifiedWaitlistPosition" INTEGER;
