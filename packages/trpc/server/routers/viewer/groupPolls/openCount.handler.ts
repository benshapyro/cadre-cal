import { prisma } from "@calcom/prisma";
import { GroupPollStatus } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";

type OpenCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const openCountHandler = async ({ ctx }: OpenCountOptions) => {
  const count = await prisma.groupPoll.count({
    where: {
      createdById: ctx.user.id,
      status: GroupPollStatus.ACTIVE,
    },
  });

  return count;
};
