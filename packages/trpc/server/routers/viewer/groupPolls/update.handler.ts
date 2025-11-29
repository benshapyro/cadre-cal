import { TRPCError } from "@trpc/server";

import GroupPollInviteEmail from "@calcom/emails/templates/group-poll-invite-email";
import { parseTimeString } from "@calcom/features/group-polls/lib/timeUtils";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateGroupPollSchema } from "./update.schema";

const log = logger.getSubLogger({ prefix: ["groupPolls", "update"] });

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateGroupPollSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  // Fetch the poll and verify ownership
  const poll = await prisma.groupPoll.findUnique({
    where: { id: input.id },
    include: {
      participants: true,
      windows: true,
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
      message: "You can only edit polls you created",
    });
  }

  // Don't allow editing booked polls
  if (poll.status === "BOOKED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a poll that has already been booked",
    });
  }

  // Build update data
  const updateData: {
    title?: string;
    description?: string | null;
    dateRangeStart?: Date;
    dateRangeEnd?: Date;
  } = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.dateRangeStart !== undefined) updateData.dateRangeStart = input.dateRangeStart;
  if (input.dateRangeEnd !== undefined) updateData.dateRangeEnd = input.dateRangeEnd;

  // Remove participants if requested
  if (input.removeParticipantIds && input.removeParticipantIds.length > 0) {
    await prisma.groupPollParticipant.deleteMany({
      where: {
        id: { in: input.removeParticipantIds },
        pollId: poll.id,
      },
    });
  }

  // Add new participants
  let newParticipants: { id: number; name: string; email: string; accessToken: string }[] = [];
  if (input.addParticipants && input.addParticipants.length > 0) {
    // Check for duplicate emails
    const existingEmails = poll.participants.map((p) => p.email.toLowerCase());
    const duplicates = input.addParticipants.filter((p) =>
      existingEmails.includes(p.email.toLowerCase())
    );

    if (duplicates.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Participants already exist: ${duplicates.map((d) => d.email).join(", ")}`,
      });
    }

    // Create new participants
    const createdParticipants = await Promise.all(
      input.addParticipants.map((participant) =>
        prisma.groupPollParticipant.create({
          data: {
            pollId: poll.id,
            type: participant.type,
            name: participant.name,
            email: participant.email,
          },
        })
      )
    );

    newParticipants = createdParticipants;
  }

  // Replace time windows if provided
  if (input.windows && input.windows.length > 0) {
    // Delete existing windows (cascades to responses)
    await prisma.groupPollWindow.deleteMany({
      where: { pollId: poll.id },
    });

    // Create new windows
    await prisma.groupPollWindow.createMany({
      data: input.windows.map((window) => ({
        pollId: poll.id,
        date: window.date,
        startTime: parseTimeString(window.startTime),
        endTime: parseTimeString(window.endTime),
      })),
    });

    // Reset all participant hasResponded flags since windows changed
    await prisma.groupPollParticipant.updateMany({
      where: { pollId: poll.id },
      data: { hasResponded: false },
    });
  }

  // Apply basic update if there are changes
  if (Object.keys(updateData).length > 0) {
    await prisma.groupPoll.update({
      where: { id: poll.id },
      data: updateData,
    });
  }

  // Send invite emails to new participants
  if (newParticipants.length > 0) {
    const t = await getTranslation(ctx.user.locale ?? "en", "common");
    const organizerName = ctx.user.name || ctx.user.email;

    const emailPromises = newParticipants.map((participant) => {
      const email = new GroupPollInviteEmail({
        language: t,
        organizerName,
        pollTitle: input.title || poll.title,
        pollLink: `${WEBAPP_URL}/p/${participant.accessToken}`,
        pollDescription: input.description !== undefined ? input.description || undefined : poll.description || undefined,
        recipientName: participant.name,
        recipientEmail: participant.email,
      });
      return email.sendEmail();
    });

    // Send emails in parallel, don't fail update if emails fail
    const emailResults = await Promise.allSettled(emailPromises);
    const emailsFailed = emailResults.filter((r) => r.status === "rejected").length;

    if (emailsFailed > 0) {
      log.warn("Some poll invite emails failed to send", {
        pollId: poll.id,
        emailsFailed,
        newParticipantCount: newParticipants.length,
      });
    }
  }

  log.info("Group poll updated", {
    pollId: poll.id,
    userId: ctx.user.id,
    participantsAdded: newParticipants.length,
    participantsRemoved: input.removeParticipantIds?.length || 0,
    windowsReplaced: !!input.windows,
  });

  // Return updated poll
  const updatedPoll = await prisma.groupPoll.findUnique({
    where: { id: poll.id },
    include: {
      participants: true,
      windows: true,
    },
  });

  return {
    id: poll.id,
    title: updatedPoll?.title,
    participantsAdded: newParticipants.length,
    participantsRemoved: input.removeParticipantIds?.length || 0,
    windowsReplaced: input.windows ? true : false,
  };
};
