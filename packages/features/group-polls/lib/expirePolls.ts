import prisma from "@calcom/prisma";

/**
 * Expires all overdue polls for a given user.
 * A poll is overdue if its dateRangeEnd is in the past and it's still ACTIVE.
 *
 * This is called on page load (check-on-load pattern) rather than via a cron job,
 * which is simpler and works well for small scale usage.
 *
 * @param userId - The user whose polls to check
 * @returns The number of polls that were expired
 */
export async function expireOverduePolls(userId: number): Promise<number> {
  // Get start of today in UTC to compare against dateRangeEnd
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.groupPoll.updateMany({
    where: {
      createdById: userId,
      status: "ACTIVE",
      dateRangeEnd: {
        lt: today,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  if (result.count > 0) {
    console.log(`Auto-expired ${result.count} overdue poll(s) for user ${userId}`);
  }

  return result.count;
}

/**
 * Checks if a single poll should be expired and expires it if so.
 * Use this when loading a single poll (get handler).
 *
 * @param pollId - The poll to check
 * @returns true if the poll was expired, false otherwise
 */
export async function expirePollIfOverdue(pollId: number): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.groupPoll.updateMany({
    where: {
      id: pollId,
      status: "ACTIVE",
      dateRangeEnd: {
        lt: today,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return result.count > 0;
}
