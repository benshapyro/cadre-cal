/**
 * Date Formatting Utilities for Group Polls Views
 *
 * These functions handle display formatting for dates and times in the UI.
 * They properly parse YYYY-MM-DD strings as local dates (not UTC) to avoid
 * off-by-one day bugs in timezone conversions.
 */

/**
 * Default display options for date formatting
 */
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

/**
 * Format a date for display, handling timezone correctly.
 * Parses YYYY-MM-DD as local date (not UTC) to avoid off-by-one day bugs.
 *
 * @param date - Date object or YYYY-MM-DD string
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string (e.g., "Mon, Dec 1")
 */
export function formatDateForDisplay(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  try {
    if (!date) return "N/A";

    // Convert to YYYY-MM-DD string first
    const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : String(date);

    // Parse YYYY-MM-DD as local date, not UTC
    // new Date("2025-12-01") interprets as UTC midnight, causing off-by-one in local timezone
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day); // Local midnight

    if (isNaN(d.getTime())) return String(date);

    return d.toLocaleDateString("en-US", options);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format time for display (HH:MM -> 12-hour format).
 *
 * @param time - Time string in HH:MM format
 * @returns Formatted time string (e.g., "9:00 AM")
 */
export function formatTimeForDisplay(time: string): string {
  if (!time || !time.includes(":")) return time;

  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Generate a unique key for a time slot.
 * Used for React keys and selection state management.
 *
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Unique slot key
 */
export function getSlotKey(date: string, startTime: string, endTime: string): string {
  return `${date}-${startTime}-${endTime}`;
}

/**
 * Ensure a value is safely renderable as a string.
 * Useful for handling unknown data from API responses.
 *
 * @param value - Any value that needs to be rendered
 * @returns Safe string representation
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
