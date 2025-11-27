import { TRPCError } from "@trpc/server";

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
        select: {
          id: true,
          type: true,
          name: true,
          email: true,
          hasResponded: true,
          accessToken: true,
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
    windows: poll.windows.map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      startTime: formatTime(w.startTime),
      endTime: formatTime(w.endTime),
    })),
    participants: poll.participants,
  };
};
