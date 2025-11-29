import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

import GroupPollInviteEmail from "@calcom/emails/templates/group-poll-invite-email";
import { parseTimeString } from "@calcom/features/group-polls/lib/timeUtils";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateGroupPollSchema } from "./create.schema";

const log = logger.getSubLogger({ prefix: ["groupPolls", "create"] });

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateGroupPollSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  // Validate user owns the event type
  const eventType = await prisma.eventType.findFirst({
    where: {
      id: input.eventTypeId,
      OR: [
        { userId: ctx.user.id },
        { team: { members: { some: { userId: ctx.user.id } } } },
      ],
    },
  });

  if (!eventType) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event type not found or you don't have access to it",
    });
  }

  const shareSlug = nanoid(10); // Generate a unique share slug

  const poll = await prisma.groupPoll.create({
    data: {
      title: input.title,
      description: input.description,
      eventTypeId: input.eventTypeId,
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

  // Send invite emails to all participants
  const t = await getTranslation(ctx.user.locale ?? "en", "common");
  const organizerName = ctx.user.name || ctx.user.email;

  const emailPromises = poll.participants.map((participant) => {
    const email = new GroupPollInviteEmail({
      language: t,
      organizerName,
      pollTitle: poll.title,
      pollLink: `${WEBAPP_URL}/p/${participant.accessToken}`,
      pollDescription: poll.description || undefined,
      recipientName: participant.name,
      recipientEmail: participant.email,
    });
    return email.sendEmail();
  });

  // Send emails in parallel, don't fail poll creation if emails fail
  const emailResults = await Promise.allSettled(emailPromises);
  const emailsSent = emailResults.filter((r) => r.status === "fulfilled").length;
  const emailsFailed = emailResults.filter((r) => r.status === "rejected").length;

  if (emailsFailed > 0) {
    log.warn("Some poll invite emails failed to send", {
      pollId: poll.id,
      emailsSent,
      emailsFailed,
    });
  }

  log.info("Group poll created", {
    pollId: poll.id,
    userId: ctx.user.id,
    participantCount: poll.participants.length,
    windowCount: poll.windows.length,
    emailsSent,
  });

  return {
    id: poll.id,
    shareSlug: poll.shareSlug,
    shareUrl: `/p/${poll.shareSlug}`,
  };
};
