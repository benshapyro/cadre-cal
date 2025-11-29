/**
 * Time and Date Utility Functions for Group Polls
 *
 * TIMEZONE STRATEGY:
 * - All functions in this file use UTC for consistency in storage and comparison
 * - Times are stored as Date objects with 1970-01-01 as base (Prisma @db.Time convention)
 * - Dates are stored as UTC midnight
 *
 * When displaying to users, use dateFormatting.ts which converts to local time.
 * When creating Cal.com bookings, use local time (see book.handler.ts).
 */

/**
 * Parse HH:MM time string to Date (using UTC to avoid timezone issues)
 * Returns a Date with 1970-01-01 as the base date (Prisma @db.Time convention)
 */
export function parseTimeString(timeStr: string): Date {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Time out of range: ${timeStr}`);
  }
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

/**
 * Parse YYYY-MM-DD date string to Date (using UTC)
 */
export function parseDateString(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format Date to HH:MM string (extracts time portion from ISO string)
 */
export function formatTime(dt: Date): string {
  return dt.toISOString().slice(11, 16);
}

/**
 * Format Date to YYYY-MM-DD string
 */
export function formatDateISO(dt: Date): string {
  return dt.toISOString().split("T")[0];
}
