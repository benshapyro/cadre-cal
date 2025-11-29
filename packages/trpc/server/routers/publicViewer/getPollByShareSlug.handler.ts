import { TRPCError } from "@trpc/server";

import { calculateAnonymousHeatMap } from "@calcom/features/group-polls/lib/heatMapUtils";
import { formatTime, formatDateISO } from "@calcom/features/group-polls/lib/timeUtils";
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

  // Calculate anonymous heat map (participant names stripped for privacy)
  const anonymousHeatMap = calculateAnonymousHeatMap(poll.windows, poll.participants);

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
        date: formatDateISO(r.date),
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
      })),
    })),
    heatMap: anonymousHeatMap,
  };
}
