import { describe, expect, it } from "vitest";

import { parseTimeString, parseDateString, formatTime, formatDateISO } from "../timeUtils";

describe("timeUtils", () => {
  describe("parseTimeString", () => {
    it("should parse valid HH:MM time strings", () => {
      const result = parseTimeString("09:30");
      expect(result.getUTCHours()).toBe(9);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it("should parse midnight (00:00)", () => {
      const result = parseTimeString("00:00");
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should parse end of day (23:59)", () => {
      const result = parseTimeString("23:59");
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
    });

    it("should throw for invalid format (no colon)", () => {
      expect(() => parseTimeString("0930")).toThrow("Invalid time format");
    });

    it("should throw for invalid format (single digit hour)", () => {
      expect(() => parseTimeString("9:30")).toThrow("Invalid time format");
    });

    it("should throw for invalid format (extra characters)", () => {
      expect(() => parseTimeString("09:30:00")).toThrow("Invalid time format");
    });

    it("should throw for hour out of range", () => {
      expect(() => parseTimeString("24:00")).toThrow("Time out of range");
    });

    it("should throw for minute out of range", () => {
      expect(() => parseTimeString("12:60")).toThrow("Time out of range");
    });

    it("should throw for negative values", () => {
      expect(() => parseTimeString("-1:30")).toThrow("Invalid time format");
    });
  });

  describe("parseDateString", () => {
    it("should parse valid YYYY-MM-DD date strings", () => {
      const result = parseDateString("2025-12-15");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11); // December is month 11
      expect(result.getUTCDate()).toBe(15);
    });

    it("should parse first day of year", () => {
      const result = parseDateString("2025-01-01");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(1);
    });

    it("should parse last day of year", () => {
      const result = parseDateString("2025-12-31");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11);
      expect(result.getUTCDate()).toBe(31);
    });

    it("should throw for invalid format (wrong separator)", () => {
      expect(() => parseDateString("2025/12/15")).toThrow("Invalid date format");
    });

    it("should throw for invalid format (incomplete)", () => {
      expect(() => parseDateString("2025-12")).toThrow("Invalid date format");
    });

    it("should throw for invalid format (wrong order)", () => {
      expect(() => parseDateString("15-12-2025")).toThrow("Invalid date format");
    });
  });

  describe("formatTime", () => {
    it("should format Date to HH:MM string", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 14, 30, 0));
      expect(formatTime(date)).toBe("14:30");
    });

    it("should format midnight correctly", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
      expect(formatTime(date)).toBe("00:00");
    });

    it("should format end of day correctly", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 23, 59, 0));
      expect(formatTime(date)).toBe("23:59");
    });

    it("should pad single digit hours and minutes", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 5, 5, 0));
      expect(formatTime(date)).toBe("05:05");
    });
  });

  describe("formatDateISO", () => {
    it("should format Date to YYYY-MM-DD string", () => {
      const date = new Date(Date.UTC(2025, 11, 15)); // December 15, 2025
      expect(formatDateISO(date)).toBe("2025-12-15");
    });

    it("should format first day of year correctly", () => {
      const date = new Date(Date.UTC(2025, 0, 1));
      expect(formatDateISO(date)).toBe("2025-01-01");
    });

    it("should pad single digit months and days", () => {
      const date = new Date(Date.UTC(2025, 4, 5)); // May 5
      expect(formatDateISO(date)).toBe("2025-05-05");
    });
  });

  describe("round-trip conversions", () => {
    it("should round-trip time parsing and formatting", () => {
      const original = "14:45";
      const parsed = parseTimeString(original);
      const formatted = formatTime(parsed);
      expect(formatted).toBe(original);
    });

    it("should round-trip date parsing and formatting", () => {
      const original = "2025-06-20";
      const parsed = parseDateString(original);
      const formatted = formatDateISO(parsed);
      expect(formatted).toBe(original);
    });
  });
});
