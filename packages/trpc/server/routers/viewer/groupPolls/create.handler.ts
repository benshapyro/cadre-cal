import { nanoid } from "nanoid";

import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateGroupPollSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateGroupPollSchema;
};

// Convert "HH:MM" string to a Date object with just the time component
function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const shareSlug = nanoid(10); // Generate a unique share slug

  const poll = await prisma.groupPoll.create({
    data: {
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      dateRangeStart: input.dateRangeStart,
      dateRangeEnd: input.dateRangeEnd,
      shareSlug,
      createdById: ctx.user.id,
      windows: {
        create: input.windows.map((window) => ({
          date: window.date,
          startTime: parseTimeString(window.startTime),
          endTime: parseTimeString(window.endTime),
        })),
      },
      participants: {
        create: input.participants.map((participant) => ({
          type: participant.type,
          userId: participant.userId,
          name: participant.name,
          email: participant.email,
        })),
      },
    },
    include: {
      windows: true,
      participants: true,
    },
  });

  return {
    id: poll.id,
    shareSlug: poll.shareSlug,
    shareUrl: `/p/${poll.shareSlug}`,
  };
};
