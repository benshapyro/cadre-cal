import { TRPCError } from "@trpc/server";

import { prisma } from "@calcom/prisma";

import type { TGetPollByTokenSchema } from "./groupPollResponse.schema";

type GetPollByTokenOptions = {
  input: TGetPollByTokenSchema;
};

export default async function handler({ input }: GetPollByTokenOptions) {
  // Find the participant by access token
  const participant = await prisma.groupPollParticipant.findUnique({
    where: {
      accessToken: input.accessToken,
    },
    include: {
      poll: {
        include: {
          windows: {
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
          },
          participants: {
            select: {
              id: true,
              name: true,
              type: true,
              hasResponded: true,
            },
          },
        },
      },
      responses: true,
    },
  });

  if (!participant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invalid access token",
    });
  }

  const poll = participant.poll;

  if (poll.status !== "ACTIVE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This poll is ${poll.status.toLowerCase()}`,
    });
  }

  // Calculate anonymous heat map (how many people are available per slot)
  // This will be computed on the frontend based on the participant responses
  // Here we just return the aggregate counts without identifying who

  // Helper to format time from DateTime to HH:mm string
  const formatTime = (dt: Date): string => {
    return dt.toISOString().slice(11, 16); // Extract HH:mm from ISO string
  };

  return {
    poll: {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      durationMinutes: poll.durationMinutes,
      dateRangeStart: poll.dateRangeStart.toISOString(),
      dateRangeEnd: poll.dateRangeEnd.toISOString(),
      status: poll.status,
      windows: poll.windows.map((w) => ({
        id: w.id,
        date: w.date.toISOString(),
        startTime: formatTime(w.startTime),
        endTime: formatTime(w.endTime),
      })),
      participantCount: poll.participants.length,
      respondedCount: poll.participants.filter((p) => p.hasResponded).length,
      // Don't expose full participant list with emails, just names and responded status
      participants: poll.participants.map((p) => ({
        name: p.name,
        hasResponded: p.hasResponded,
        type: p.type,
      })),
    },
    participant: {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      hasResponded: participant.hasResponded,
      responses: participant.responses.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
      })),
    },
  };
}
