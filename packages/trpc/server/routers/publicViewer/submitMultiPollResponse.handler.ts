import { TRPCError } from "@trpc/server";

import { prisma } from "@calcom/prisma";

import type { TSubmitMultiPollResponseSchema } from "./groupPollResponse.schema";

type SubmitMultiPollResponseOptions = {
  input: TSubmitMultiPollResponseSchema;
};

// Convert "HH:MM" string to a Date object with just the time component
function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  return date;
}

// Parse YYYY-MM-DD string to a Date object
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export default async function handler({ input }: SubmitMultiPollResponseOptions) {
  // Find the poll by shareSlug
  const poll = await prisma.groupPoll.findUnique({
    where: {
      shareSlug: input.shareSlug,
    },
    include: {
      participants: true,
    },
  });

  if (!poll) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Poll not found",
    });
  }

  if (poll.status !== "ACTIVE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This poll is ${poll.status.toLowerCase()}`,
    });
  }

  // Validate all participant IDs belong to this poll
  const validParticipantIds = new Set(poll.participants.map((p) => p.id));
  for (const participantId of input.participantIds) {
    if (!validParticipantIds.has(participantId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid participant ID: ${participantId}`,
      });
    }
  }

  // Update responses for all selected participants in a transaction
  await prisma.$transaction(async (tx) => {
    for (const participantId of input.participantIds) {
      // Delete existing responses for this participant
      await tx.groupPollResponse.deleteMany({
        where: {
          participantId,
        },
      });

      // Create new responses
      if (input.availability.length > 0) {
        await tx.groupPollResponse.createMany({
          data: input.availability.map((slot) => ({
            participantId,
            date: parseDateString(slot.date),
            startTime: parseTimeString(slot.startTime),
            endTime: parseTimeString(slot.endTime),
          })),
        });
      }

      // Update participant status
      await tx.groupPollParticipant.update({
        where: {
          id: participantId,
        },
        data: {
          hasResponded: true,
          respondedAt: new Date(),
        },
      });
    }
  });

  return {
    success: true,
    updatedParticipantCount: input.participantIds.length,
  };
}
