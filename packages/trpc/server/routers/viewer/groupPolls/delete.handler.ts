import { TRPCError } from "@trpc/server";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

const log = logger.getSubLogger({ prefix: ["groupPolls", "delete"] });

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: {
    id: number;
  };
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  // First check if the poll exists and belongs to the user
  const poll = await prisma.groupPoll.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      createdById: true,
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
      message: "You don't have permission to delete this poll",
    });
  }

  // Delete the poll (cascade will handle windows, participants, responses)
  await prisma.groupPoll.delete({
    where: {
      id: input.id,
    },
  });

  log.info("Group poll deleted", {
    pollId: input.id,
    userId: ctx.user.id,
  });

  return { success: true };
};
