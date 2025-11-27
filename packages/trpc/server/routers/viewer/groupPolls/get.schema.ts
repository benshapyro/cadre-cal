import { z } from "zod";

export const ZGetGroupPollSchema = z.object({
  id: z.number(),
});

export type TGetGroupPollSchema = z.infer<typeof ZGetGroupPollSchema>;
