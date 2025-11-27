-- CreateEnum
CREATE TYPE "public"."GroupPollStatus" AS ENUM ('ACTIVE', 'BOOKED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ParticipantType" AS ENUM ('CADRE_REQUIRED', 'CADRE_OPTIONAL', 'CLIENT');

-- CreateTable
CREATE TABLE "public"."GroupPoll" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "status" "public"."GroupPollStatus" NOT NULL DEFAULT 'ACTIVE',
    "shareSlug" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupPollWindow" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "GroupPollWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupPollParticipant" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "type" "public"."ParticipantType" NOT NULL,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hasResponded" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPollParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupPollResponse" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPollResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupPoll_shareSlug_key" ON "public"."GroupPoll"("shareSlug");

-- CreateIndex
CREATE INDEX "GroupPoll_createdById_idx" ON "public"."GroupPoll"("createdById");

-- CreateIndex
CREATE INDEX "GroupPoll_shareSlug_idx" ON "public"."GroupPoll"("shareSlug");

-- CreateIndex
CREATE INDEX "GroupPoll_status_idx" ON "public"."GroupPoll"("status");

-- CreateIndex
CREATE INDEX "GroupPollWindow_pollId_idx" ON "public"."GroupPollWindow"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPollWindow_pollId_date_startTime_endTime_key" ON "public"."GroupPollWindow"("pollId", "date", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPollParticipant_accessToken_key" ON "public"."GroupPollParticipant"("accessToken");

-- CreateIndex
CREATE INDEX "GroupPollParticipant_pollId_idx" ON "public"."GroupPollParticipant"("pollId");

-- CreateIndex
CREATE INDEX "GroupPollParticipant_email_idx" ON "public"."GroupPollParticipant"("email");

-- CreateIndex
CREATE INDEX "GroupPollParticipant_accessToken_idx" ON "public"."GroupPollParticipant"("accessToken");

-- CreateIndex
CREATE INDEX "GroupPollResponse_participantId_idx" ON "public"."GroupPollResponse"("participantId");

-- AddForeignKey
ALTER TABLE "public"."GroupPoll" ADD CONSTRAINT "GroupPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupPollWindow" ADD CONSTRAINT "GroupPollWindow_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."GroupPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupPollParticipant" ADD CONSTRAINT "GroupPollParticipant_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."GroupPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupPollParticipant" ADD CONSTRAINT "GroupPollParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupPollResponse" ADD CONSTRAINT "GroupPollResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."GroupPollParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
