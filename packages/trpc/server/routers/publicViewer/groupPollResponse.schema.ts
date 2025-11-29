import { z } from "zod";

export const ZGetPollByTokenSchema = z.object({
  accessToken: z.string(),
});

export type TGetPollByTokenSchema = z.infer<typeof ZGetPollByTokenSchema>;

export const ZSubmitPollResponseSchema = z.object({
  accessToken: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  availability: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    })
  ),
});

export type TSubmitPollResponseSchema = z.infer<typeof ZSubmitPollResponseSchema>;

// Schema for getting poll by shareSlug (poll-level public link)
export const ZGetPollByShareSlugSchema = z.object({
  shareSlug: z.string(),
});

export type TGetPollByShareSlugSchema = z.infer<typeof ZGetPollByShareSlugSchema>;

// Schema for submitting responses for multiple participants at once
export const ZSubmitMultiPollResponseSchema = z.object({
  shareSlug: z.string(),
  participantIds: z.array(z.number()).min(1, "Select at least one participant"),
  availability: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    })
  ),
});

export type TSubmitMultiPollResponseSchema = z.infer<typeof ZSubmitMultiPollResponseSchema>;
