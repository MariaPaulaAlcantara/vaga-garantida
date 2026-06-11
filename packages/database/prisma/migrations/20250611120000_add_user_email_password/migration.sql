-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Clear existing OTP-only users (dev; no email/password backfill)
TRUNCATE TABLE "EventRegistration", "ConfirmationPolicy", "Event", "OtpSession", "User" CASCADE;

-- Make columns required
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
