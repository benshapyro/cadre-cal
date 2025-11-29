import { TRPCError } from "@trpc/server";

import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type CloseOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: {
    id: number;
  };
};

export const closeHandler = async ({ ctx, input }: CloseOptions) => {
  // First check if the poll exists and belongs to the user
  const poll = await prisma.groupPoll.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      createdById: true,
      status: true,
    },
  });

  if (!poll) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Poll not found",
    });
  }

  if (poll.createdById !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to close this poll",
    });
  }

  if (poll.status === "BOOKED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot close a poll that has already been booked",
    });
  }

  if (poll.status === "CLOSED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Poll is already closed",
    });
  }

  // Close the poll
  await prisma.groupPoll.update({
    where: {
      id: input.id,
    },
    data: {
      status: "CLOSED",
    },
  });

  return { success: true };
};
