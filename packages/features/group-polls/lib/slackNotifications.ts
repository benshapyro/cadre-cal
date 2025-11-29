import { WebClient } from "@slack/web-api";

import prisma from "@calcom/prisma";
import type { ParticipantType } from "@calcom/prisma/enums";

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
    console.log("[Slack] Not configured, skipping notifications");
    return;
  }

  try {
    // Fetch poll with participants to check conditions
    const poll = await prisma.groupPoll.findUnique({
      where: { id: ctx.pollId },
      include: { participants: true },
    });

    if (!poll) {
      console.log(`[Slack] Poll ${ctx.pollId} not found`);
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
      console.log("[Slack] No Cadre participants to notify");
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

    console.log(`[Slack] Sent ${notificationType} notifications to ${cadreParticipants.length} Cadre participants`);
  } catch (error) {
    // Log but don't throw - Slack errors shouldn't block poll responses
    console.error("[Slack] Error sending notifications:", error);
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
      console.log(`[Slack] No user found for email: ${email}`);
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

    console.log(`[Slack] Notification sent to ${email}`);
  } catch (error) {
    // Log individual failures but continue with other participants
    console.error(`[Slack] Failed to send notification to ${email}:`, error);
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
