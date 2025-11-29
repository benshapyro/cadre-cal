import publicProcedure from "../../procedures/publicProcedure";
import { router } from "../../trpc";
import { ZUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";
import {
  ZGetPollByTokenSchema,
  ZSubmitPollResponseSchema,
  ZGetPollByShareSlugSchema,
  ZSubmitMultiPollResponseSchema,
} from "./groupPollResponse.schema";
import { ZMarkHostAsNoShowInputSchema } from "./markHostAsNoShow.schema";
import { event } from "./procedures/event";
import { ZSamlTenantProductInputSchema } from "./samlTenantProduct.schema";
import { ZSubmitRatingInputSchema } from "./submitRating.schema";

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  countryCode: publicProcedure.query(async (opts) => {
    const { default: handler } = await import("./countryCode.handler");
    return handler(opts);
  }),
  submitRating: publicProcedure.input(ZSubmitRatingInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./submitRating.handler");
    return handler(opts);
  }),
  markHostAsNoShow: publicProcedure.input(ZMarkHostAsNoShowInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./markHostAsNoShow.handler");
    return handler(opts);
  }),
  samlTenantProduct: publicProcedure.input(ZSamlTenantProductInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./samlTenantProduct.handler");
    return handler(opts);
  }),
  event,
  ssoConnections: publicProcedure.query(async () => {
    const { default: handler } = await import("./ssoConnections.handler");
    return handler();
  }),

  checkIfUserEmailVerificationRequired: publicProcedure
    .input(ZUserEmailVerificationRequiredSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./checkIfUserEmailVerificationRequired.handler");
      return handler(opts);
    }),

  // Group Poll public endpoints
  getPollByToken: publicProcedure.input(ZGetPollByTokenSchema).query(async (opts) => {
    const { default: handler } = await import("./getPollByToken.handler");
    return handler(opts);
  }),

  submitPollResponse: publicProcedure.input(ZSubmitPollResponseSchema).mutation(async (opts) => {
    const { default: handler } = await import("./submitPollResponse.handler");
    return handler(opts);
  }),

  // Public poll endpoints (by shareSlug - single shareable link)
  getPollByShareSlug: publicProcedure.input(ZGetPollByShareSlugSchema).query(async (opts) => {
    const { default: handler } = await import("./getPollByShareSlug.handler");
    return handler(opts);
  }),

  submitMultiPollResponse: publicProcedure.input(ZSubmitMultiPollResponseSchema).mutation(async (opts) => {
    const { default: handler } = await import("./submitMultiPollResponse.handler");
    return handler(opts);
  }),
});
