import { z } from "zod";

import { ParticipantType } from "@calcom/prisma/enums";

export const ZCreateGroupPollSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  eventTypeId: z.number().int().positive("Event type is required"),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  dateRangeStart: z.date(),
  dateRangeEnd: z.date(),
  windows: z.array(
    z.object({
      date: z.date(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    })
  ),
  participants: z.array(
    z.object({
      type: z.nativeEnum(ParticipantType),
      userId: z.number().optional(),
      name: z.string().min(1),
      email: z.string().email(),
    })
  ),
});

export type TCreateGroupPollSchema = z.infer<typeof ZCreateGroupPollSchema>;
