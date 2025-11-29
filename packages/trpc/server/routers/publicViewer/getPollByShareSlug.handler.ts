import { TRPCError } from "@trpc/server";

import { calculateHeatMap } from "@calcom/features/group-polls";
import { prisma } from "@calcom/prisma";

import type { TGetPollByShareSlugSchema } from "./groupPollResponse.schema";

type GetPollByShareSlugOptions = {
  input: TGetPollByShareSlugSchema;
};

export default async function handler({ input }: GetPollByShareSlugOptions) {
  // Find the poll by shareSlug
  const poll = await prisma.groupPoll.findUnique({
    where: {
      shareSlug: input.shareSlug,
    },
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

  // Calculate heat map (anonymous - no participant names in cells)
  const heatMap = calculateHeatMap(formattedWindows, allResponses, formattedParticipants);
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
      shareSlug: poll.shareSlug,
      windows: poll.windows.map((w) => ({
        id: w.id,
        date: w.date.toISOString(),
        startTime: formatTime(w.startTime),
        endTime: formatTime(w.endTime),
      })),
    },
    // Full participant list with IDs for selection dropdown
    participants: poll.participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      type: p.type,
      hasResponded: p.hasResponded,
      // Include their existing responses so UI can pre-populate
      responses: p.responses.map((r) => ({
        id: r.id,
        date: r.date.toISOString().split("T")[0],
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
      })),
    })),
    heatMap: anonymousHeatMap,
  };
}
