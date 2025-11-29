import { TRPCError } from "@trpc/server";

import { checkAndSendSlackNotifications } from "@calcom/features/group-polls/lib/slackNotifications";
import { parseTimeString, parseDateString } from "@calcom/features/group-polls/lib/timeUtils";
import { prisma } from "@calcom/prisma";

import type { TSubmitMultiPollResponseSchema } from "./groupPollResponse.schema";

type SubmitMultiPollResponseOptions = {
  input: TSubmitMultiPollResponseSchema;
};

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

  // After successful response submission, send Slack notifications
  // This is done outside the transaction so Slack errors don't roll back the response
  for (const participantId of input.participantIds) {
    const participant = poll.participants.find((p) => p.id === participantId);
    if (participant) {
      // Fire and forget - don't await to avoid blocking the response
      checkAndSendSlackNotifications({
        pollId: poll.id,
        pollTitle: poll.title,
        pollShareSlug: poll.shareSlug,
        respondedParticipantName: participant.name,
        respondedParticipantType: participant.type,
      }).catch((err: unknown) => {
        console.error("[Slack] Background notification failed:", err);
      });
    }
  }

  return {
    success: true,
    updatedParticipantCount: input.participantIds.length,
  };
}
