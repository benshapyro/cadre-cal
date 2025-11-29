import { z } from "zod";

import { ParticipantType } from "@calcom/prisma/enums";

export const ZUpdateGroupPollSchema = z.object({
  id: z.number().int().positive("Poll ID is required"),
  title: z.string().min(1, "Title is required").max(200).optional(),
  description: z.string().optional().nullable(),
  // Add new participants
  addParticipants: z
    .array(
      z.object({
        type: z.nativeEnum(ParticipantType),
        name: z.string().min(1),
        email: z.string().email(),
      })
    )
    .optional(),
  // Remove participants by ID
  removeParticipantIds: z.array(z.number().int().positive()).optional(),
  // Replace all time windows (simpler than add/remove for date ranges)
  windows: z
    .array(
      z.object({
        date: z.date(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      })
    )
    .optional(),
  // Update date range (will regenerate windows if provided)
  dateRangeStart: z.date().optional(),
  dateRangeEnd: z.date().optional(),
});

export type TUpdateGroupPollSchema = z.infer<typeof ZUpdateGroupPollSchema>;
