import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { groupPollsRouter } from "@calcom/trpc/server/routers/viewer/groupPolls/_router";

export default createNextApiHandler(groupPollsRouter);
