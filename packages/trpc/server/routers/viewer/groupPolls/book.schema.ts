import { z } from "zod";

export const ZBookFromPollSchema = z.object({
  pollId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
});

export type TBookFromPollSchema = z.infer<typeof ZBookFromPollSchema>;
