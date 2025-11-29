import { WebClient } from "@slack/web-api";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { ParticipantType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["groupPolls", "slack"] });

// Initialize Slack client only if token is configured
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

interface NotificationContext {
  pollId: number;
  pollTitle: string;
  pollShareSlug: string;
  respondedParticipantName: string;
  respondedParticipantType: ParticipantType;
}

/**
 * Checks notification conditions and sends Slack DMs to Cadre participants.
 *
 * Triggers:
 * 1. When a CADRE_REQUIRED participant responds → notify all Cadre participants
 * 2. When ALL participants have responded → notify all Cadre participants
 */
export async function checkAndSendSlackNotifications(ctx: NotificationContext): Promise<void> {
  if (!slack) {
    log.debug("Slack not configured, skipping notifications", { pollId: ctx.pollId });
    return;
  }

  try {
    // Fetch poll with participants to check conditions
    const poll = await prisma.groupPoll.findUnique({
      where: { id: ctx.pollId },
      include: { participants: true },
    });

    if (!poll) {
      log.warn("Poll not found for Slack notification", { pollId: ctx.pollId });
      return;
    }

    const allResponded = poll.participants.every((p) => p.hasResponded);
    const isMustHaveResponse = ctx.respondedParticipantType === "CADRE_REQUIRED";

    // Determine notification type
    let notificationType: "must_have_responded" | "all_responded" | null = null;

    if (allResponded) {
      notificationType = "all_responded";
    } else if (isMustHaveResponse) {
      notificationType = "must_have_responded";
    }

    if (!notificationType) {
      // No notification needed (optional/client responded, not all done yet)
      return;
    }

    // Get Cadre participants to notify (both required and optional)
    const cadreParticipants = poll.participants.filter(
      (p) => p.type === "CADRE_REQUIRED" || p.type === "CADRE_OPTIONAL"
    );

    if (cadreParticipants.length === 0) {
      log.debug("No Cadre participants to notify", { pollId: ctx.pollId });
      return;
    }

    const pollUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/group-polls/${ctx.pollId}`;
    const respondedCount = poll.participants.filter((p) => p.hasResponded).length;

    // Send DM to each Cadre participant
    for (const participant of cadreParticipants) {
      await sendSlackDM(participant.email, {
        notificationType,
        pollTitle: ctx.pollTitle,
        pollUrl,
        respondedName: ctx.respondedParticipantName,
        totalParticipants: poll.participants.length,
        respondedCount,
      });
    }

    log.info("Slack notifications sent", {
      pollId: ctx.pollId,
      notificationType,
      recipientCount: cadreParticipants.length,
    });
  } catch (error) {
    // Log but don't throw - Slack errors shouldn't block poll responses
    log.error("Error sending Slack notifications", {
      pollId: ctx.pollId,
      pollTitle: ctx.pollTitle,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

interface SlackDMData {
  notificationType: "must_have_responded" | "all_responded";
  pollTitle: string;
  pollUrl: string;
  respondedName: string;
  totalParticipants: number;
  respondedCount: number;
}

async function sendSlackDM(email: string, data: SlackDMData): Promise<void> {
  if (!slack) return;

  try {
    // Look up Slack user by email
    const userResult = await slack.users.lookupByEmail({ email });
    const slackUserId = userResult.user?.id;

    if (!slackUserId) {
      log.debug("No Slack user found for email", { email });
      return;
    }

    // Build message based on notification type
    const message =
      data.notificationType === "all_responded"
        ? buildAllRespondedMessage(data)
        : buildMustHaveRespondedMessage(data);

    // Send DM (channel = user ID for DMs)
    await slack.chat.postMessage({
      channel: slackUserId,
      ...message,
    });

    log.debug("Slack notification sent", { email, notificationType: data.notificationType });
  } catch (error) {
    // Log individual failures but continue with other participants
    log.error("Failed to send Slack notification to user", {
      email,
      pollTitle: data.pollTitle,
      notificationType: data.notificationType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildMustHaveRespondedMessage(data: {
  pollTitle: string;
  pollUrl: string;
  respondedName: string;
  totalParticipants: number;
  respondedCount: number;
}) {
  return {
    text: `${data.respondedName} responded to "${data.pollTitle}"`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.respondedName}* just responded to your poll!`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Poll:*\n${data.pollTitle}` },
          { type: "mrkdwn", text: `*Progress:*\n${data.respondedCount}/${data.totalParticipants} responded` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Results" },
            url: data.pollUrl,
            style: "primary",
          },
        ],
      },
    ],
  };
}

function buildAllRespondedMessage(data: { pollTitle: string; pollUrl: string; totalParticipants: number }) {
  return {
    text: `Everyone has responded to "${data.pollTitle}"!`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*All ${data.totalParticipants} participants* have responded to your poll!`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.pollTitle}*\nReady to book? View the results to pick a time.`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Results & Book" },
            url: data.pollUrl,
            style: "primary",
          },
        ],
      },
    ],
  };
}
