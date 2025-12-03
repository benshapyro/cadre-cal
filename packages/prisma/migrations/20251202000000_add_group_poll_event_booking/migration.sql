-- AlterTable: Add event type and booking columns to GroupPoll
ALTER TABLE "public"."GroupPoll" ADD COLUMN "eventTypeId" INTEGER;
ALTER TABLE "public"."GroupPoll" ADD COLUMN "bookingId" INTEGER;
ALTER TABLE "public"."GroupPoll" ADD COLUMN "selectedDate" DATE;
ALTER TABLE "public"."GroupPoll" ADD COLUMN "selectedStartTime" TIME;
ALTER TABLE "public"."GroupPoll" ADD COLUMN "selectedEndTime" TIME;

-- CreateIndex
CREATE INDEX "GroupPoll_eventTypeId_idx" ON "public"."GroupPoll"("eventTypeId");

-- CreateIndex
CREATE INDEX "GroupPoll_bookingId_idx" ON "public"."GroupPoll"("bookingId");

-- CreateIndex (unique constraint on bookingId)
CREATE UNIQUE INDEX "GroupPoll_bookingId_key" ON "public"."GroupPoll"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."GroupPoll" ADD CONSTRAINT "GroupPoll_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupPoll" ADD CONSTRAINT "GroupPoll_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
