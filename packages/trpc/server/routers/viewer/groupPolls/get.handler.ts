import { TRPCError } from "@trpc/server";

import { expirePollIfOverdue } from "@calcom/features/group-polls/lib/expirePolls";
import { calculateBothHeatMaps } from "@calcom/features/group-polls/lib/heatMapUtils";
import { formatTime } from "@calcom/features/group-polls/lib/timeUtils";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetGroupPollSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetGroupPollSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  // Check if the poll should be auto-expired (void to indicate intentionally unused)
  await expirePollIfOverdue(input.id);

  const poll = await prisma.groupPoll.findUnique({
    where: {
      id: input.id,
    },
    include: {
      eventType: {
        select: {
          id: true,
          title: true,
          length: true,
          slug: true,
        },
      },
      booking: {
        select: {
          id: true,
          uid: true,
          status: true,
        },
      },
      windows: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
        },
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

  // Only the creator can view the full poll details
  if (poll.createdById !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to view this poll",
    });
  }

  // Calculate heat maps using shared utility
  const { heatMap, heatMapRequired } = calculateBothHeatMaps(poll.windows, poll.participants);

  // Return a clean object to avoid Date serialization issues
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    status: poll.status,
    shareSlug: poll.shareSlug,
    durationMinutes: poll.durationMinutes,
    dateRangeStart: poll.dateRangeStart.toISOString(),
    dateRangeEnd: poll.dateRangeEnd.toISOString(),
    createdAt: poll.createdAt.toISOString(),
    eventType: poll.eventType
      ? {
          id: poll.eventType.id,
          title: poll.eventType.title,
          length: poll.eventType.length,
          slug: poll.eventType.slug,
        }
      : null,
    booking: poll.booking
      ? {
          id: poll.booking.id,
          uid: poll.booking.uid,
          status: poll.booking.status,
        }
      : null,
    selectedDate: poll.selectedDate?.toISOString() || null,
    selectedStartTime: poll.selectedStartTime ? formatTime(poll.selectedStartTime) : null,
    selectedEndTime: poll.selectedEndTime ? formatTime(poll.selectedEndTime) : null,
    windows: poll.windows.map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      startTime: formatTime(w.startTime),
      endTime: formatTime(w.endTime),
    })),
    participants: poll.participants.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      email: p.email,
      hasResponded: p.hasResponded,
      accessToken: p.accessToken,
    })),
    heatMap,
    heatMapRequired,
  };
};
