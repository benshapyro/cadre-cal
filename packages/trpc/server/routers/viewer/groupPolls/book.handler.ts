import { TRPCError } from "@trpc/server";
import short from "short-uuid";

import EventManager from "@calcom/features/bookings/lib/EventManager";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import type { TrpcSessionUser } from "../../../types";
import type { TBookFromPollSchema } from "./book.schema";

const log = logger.getSubLogger({ prefix: ["groupPolls/book"] });

type BookFromPollOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBookFromPollSchema;
};

// Convert "HH:mm" string to a Date object with just the time component
function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

// Combine date string (YYYY-MM-DD) and time string (HH:mm) into a full DateTime
function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export const bookFromPollHandler = async ({ ctx, input }: BookFromPollOptions) => {
  const { pollId, date, startTime, endTime } = input;

  // 1. Fetch poll with event type and participants
  const poll = await prisma.groupPoll.findUnique({
    where: { id: pollId },
    include: {
      eventType: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              timeZone: true,
            },
          },
        },
      },
      participants: {
        include: {
          responses: true,
        },
      },
    },
  });

  if (!poll) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Poll not found",
    });
  }

  // 2. Validate poll belongs to user
  if (poll.createdById !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to book from this poll",
    });
  }

  // 3. Validate poll has event type
  if (!poll.eventType || !poll.eventTypeId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Poll must be linked to an event type to create a booking",
    });
  }

  // 4. Validate poll is not already booked
  if (poll.bookingId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This poll already has a booking",
    });
  }

  // 4b. Fetch user credentials and destination calendar for calendar sync
  const organizer = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      timeZone: true,
      locale: true,
      credentials: { select: credentialForCalendarServiceSelect },
      destinationCalendar: true,
    },
  });

  if (!organizer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  // 5. Find participants available for this slot
  // Parse selected date for comparison
  const selectedDateStr = date; // YYYY-MM-DD

  const availableParticipants = poll.participants.filter((p) =>
    p.responses.some((r) => {
      const responseDate = r.date.toISOString().split("T")[0];
      const responseStart = r.startTime.toISOString().slice(11, 16);
      const responseEnd = r.endTime.toISOString().slice(11, 16);

      // Check if the response window covers the selected time
      return responseDate === selectedDateStr && responseStart <= startTime && responseEnd >= endTime;
    })
  );

  // 6. Build booking data
  const startDateTime = combineDateAndTime(date, startTime);
  const endDateTime = combineDateAndTime(date, endTime);
  const translator = short();
  const uid = translator.new();

  // 7. Create booking
  const booking = await prisma.booking.create({
    data: {
      uid,
      title: `${poll.eventType.title} (from Group Poll: ${poll.title})`,
      description: poll.description || poll.eventType.description || null,
      startTime: startDateTime,
      endTime: endDateTime,
      eventTypeId: poll.eventTypeId,
      userId: poll.eventType.owner?.id || ctx.user.id,
      status: BookingStatus.ACCEPTED,
      metadata: {
        source: "group-poll",
        pollId: poll.id,
        pollTitle: poll.title,
      },
      // Create attendees from available participants
      attendees: {
        create: availableParticipants.map((p) => ({
          name: p.name,
          email: p.email,
          timeZone: ctx.user.timeZone || "UTC",
        })),
      },
    },
    select: {
      id: true,
      uid: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      attendees: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // 7b. Create calendar event via EventManager (sends Google Calendar invites)
  try {
    // Build the organizer Person object
    const organizerPerson: Person = {
      name: organizer.name || organizer.email,
      email: organizer.email,
      timeZone: organizer.timeZone || "UTC",
      language: {
        translate: ((key: string) => key) as unknown as Person["language"]["translate"],
        locale: organizer.locale || "en",
      },
    };

    // Build attendees list
    const attendeesForCalendar: Person[] = availableParticipants.map((p) => ({
      name: p.name,
      email: p.email,
      timeZone: organizer.timeZone || "UTC",
      language: {
        translate: ((key: string) => key) as unknown as Person["language"]["translate"],
        locale: organizer.locale || "en",
      },
    }));

    // Build the CalendarEvent
    // destinationCalendar can be a single object or array - CalendarEvent expects array or null
    const destinationCalendarArray = organizer.destinationCalendar ? [organizer.destinationCalendar] : null;

    const calendarEvent: CalendarEvent = {
      type: poll.eventType.title,
      title: booking.title,
      description: poll.description || poll.eventType.description || "",
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      organizer: organizerPerson,
      attendees: attendeesForCalendar,
      uid: booking.uid,
      destinationCalendar: destinationCalendarArray,
    };

    // Initialize EventManager with user's calendar credentials
    // Add delegatedTo: null since we're not using delegation credentials for group polls
    const credentialsWithDelegation = organizer.credentials.map((cred) => ({
      ...cred,
      delegatedTo: null,
    }));

    const eventManager = new EventManager({
      credentials: credentialsWithDelegation,
      destinationCalendar: organizer.destinationCalendar,
    });

    // Create the calendar event
    const calendarResults = await eventManager.create(calendarEvent);

    log.info("Calendar event created from group poll", {
      pollId: poll.id,
      bookingId: booking.id,
      calendarResultsCount: calendarResults?.referencesToCreate?.length || 0,
    });

    // Store calendar references in BookingReference table
    if (calendarResults?.referencesToCreate?.length) {
      await prisma.bookingReference.createMany({
        data: calendarResults.referencesToCreate.map((ref) => ({
          bookingId: booking.id,
          type: ref.type,
          uid: ref.uid || "",
          meetingId: ref.meetingId || null,
          meetingPassword: ref.meetingPassword || null,
          meetingUrl: ref.meetingUrl || null,
          externalCalendarId: ref.externalCalendarId || null,
          credentialId: ref.credentialId || null,
        })),
      });
    }
  } catch (calendarError) {
    // Log the error but don't fail the booking - calendar sync is secondary
    log.error("Failed to create calendar event for group poll booking", {
      pollId: poll.id,
      bookingId: booking.id,
      error: calendarError instanceof Error ? calendarError.message : String(calendarError),
    });
    // Booking still succeeds, just without calendar integration
  }

  // 8. Update poll status and link booking
  await prisma.groupPoll.update({
    where: { id: pollId },
    data: {
      status: "BOOKED",
      bookingId: booking.id,
      selectedDate: new Date(date),
      selectedStartTime: parseTimeString(startTime),
      selectedEndTime: parseTimeString(endTime),
    },
  });

  return {
    success: true,
    booking: {
      id: booking.id,
      uid: booking.uid,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      attendeeCount: availableParticipants.length,
    },
  };
};
