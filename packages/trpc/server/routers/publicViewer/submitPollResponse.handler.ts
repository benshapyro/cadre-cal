import { TRPCError } from "@trpc/server";

import { checkAndSendSlackNotifications } from "@calcom/features/group-polls/lib/slackNotifications";
import { parseTimeString, parseDateString } from "@calcom/features/group-polls/lib/timeUtils";
import { prisma } from "@calcom/prisma";

import type { TSubmitPollResponseSchema } from "./groupPollResponse.schema";

type SubmitPollResponseOptions = {
  input: TSubmitPollResponseSchema;
};

export default async function handler({ input }: SubmitPollResponseOptions) {
  // Find the participant by access token
  const participant = await prisma.groupPollParticipant.findUnique({
    where: {
      accessToken: input.accessToken,
    },
    include: {
      poll: true,
    },
  });

  if (!participant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invalid access token",
    });
  }

  if (participant.poll.status !== "ACTIVE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This poll is ${participant.poll.status.toLowerCase()}`,
    });
  }

  // Update participant name/email if provided (in case it changed)
  // and delete any existing responses before creating new ones
  await prisma.$transaction(async (tx) => {
    // Delete existing responses
    await tx.groupPollResponse.deleteMany({
      where: {
        participantId: participant.id,
      },
    });

    // Create new responses
    if (input.availability.length > 0) {
      await tx.groupPollResponse.createMany({
        data: input.availability.map((slot) => ({
          participantId: participant.id,
          date: parseDateString(slot.date),
          startTime: parseTimeString(slot.startTime),
          endTime: parseTimeString(slot.endTime),
        })),
      });
    }

    // Update participant status
    await tx.groupPollParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        name: input.name,
        email: input.email,
        hasResponded: true,
        respondedAt: new Date(),
      },
    });
  });

  // After successful response submission, send Slack notifications
  // Fire and forget - don't await to avoid blocking the response
  checkAndSendSlackNotifications({
    pollId: participant.poll.id,
    pollTitle: participant.poll.title,
    pollShareSlug: participant.poll.shareSlug,
    respondedParticipantName: input.name,
    respondedParticipantType: participant.type,
  }).catch((err: unknown) => {
    console.error("[Slack] Background notification failed:", err);
  });

  return { success: true };
}
