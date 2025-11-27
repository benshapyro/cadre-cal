import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const polls = await prisma.groupPoll.findMany({
    where: {
      createdById: ctx.user.id,
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          type: true,
          hasResponded: true,
        },
      },
      _count: {
        select: {
          windows: true,
          participants: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    durationMinutes: poll.durationMinutes,
    dateRangeStart: poll.dateRangeStart,
    dateRangeEnd: poll.dateRangeEnd,
    status: poll.status,
    shareSlug: poll.shareSlug,
    createdAt: poll.createdAt,
    windowCount: poll._count.windows,
    participantCount: poll._count.participants,
    respondedCount: poll.participants.filter((p) => p.hasResponded).length,
  }));
};
