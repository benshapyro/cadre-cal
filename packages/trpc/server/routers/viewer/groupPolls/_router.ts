import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZBookFromPollSchema } from "./book.schema";
import { ZCreateGroupPollSchema } from "./create.schema";
import { ZGetGroupPollSchema } from "./get.schema";

export const groupPollsRouter = router({
  // List all polls created by the user
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");
    return listHandler({ ctx });
  }),

  // Get a single poll by ID
  get: authedProcedure.input(ZGetGroupPollSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");
    return getHandler({ ctx, input });
  }),

  // Create a new poll
  create: authedProcedure.input(ZCreateGroupPollSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");
    return createHandler({ ctx, input });
  }),

  // Delete a poll
  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteHandler } = await import("./delete.handler");
      return deleteHandler({ ctx, input });
    }),

  // Book a time slot from a poll
  book: authedProcedure.input(ZBookFromPollSchema).mutation(async ({ ctx, input }) => {
    const { bookFromPollHandler } = await import("./book.handler");
    return bookFromPollHandler({ ctx, input });
  }),
});
