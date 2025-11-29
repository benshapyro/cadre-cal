import { TRPCError } from "@trpc/server";

import { calculateHeatMap } from "@calcom/features/group-polls";
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
            include: {
              responses: true,
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

  // Helper to format time from DateTime to HH:mm string
  const formatTime = (dt: Date): string => {
    return dt.toISOString().slice(11, 16); // Extract HH:mm from ISO string
  };

  // Format windows for heat map calculation
  const formattedWindows = poll.windows.map((w) => ({
    id: w.id,
    date: w.date,
    startTime: formatTime(w.startTime),
    endTime: formatTime(w.endTime),
  }));

  // Collect all responses from all participants
  const allResponses = poll.participants.flatMap((p) =>
    p.responses.map((r) => ({
      id: r.id,
      participantId: p.id,
      date: r.date.toISOString().split("T")[0], // YYYY-MM-DD
      startTime: formatTime(r.startTime),
      endTime: formatTime(r.endTime),
    }))
  );

  // Format participants for heat map calculation
  const formattedParticipants = poll.participants.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as "CADRE_REQUIRED" | "CADRE_OPTIONAL" | "CLIENT",
    hasResponded: p.hasResponded,
  }));

  // Calculate heat map
  const heatMap = calculateHeatMap(formattedWindows, allResponses, formattedParticipants);

  // Create anonymous heat map (strip participant names for privacy)
  const anonymousHeatMap = {
    ...heatMap,
    cells: heatMap.cells.map((c) => ({ ...c, participantNames: [] })),
    stats: {
      ...heatMap.stats,
      optimalSlots: heatMap.stats.optimalSlots.map((s) => ({ ...s, participantNames: [] })),
      perfectSlots: heatMap.stats.perfectSlots.map((s) => ({ ...s, participantNames: [] })),
    },
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
    heatMap: anonymousHeatMap,
  };
}
