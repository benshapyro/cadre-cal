import { TRPCError } from "@trpc/server";

import { calculateHeatMap } from "@calcom/features/group-polls";
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

  // Return a clean object to avoid Date serialization issues
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    status: poll.status,
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
  };
};
