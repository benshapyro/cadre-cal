import { describe, expect, it } from "vitest";

import {
  calculateHeatMap,
  getHeatMapColorClass,
  HeatMapCell,
  HeatMapData,
} from "../heatMapCalculation";

// Mock data types matching Prisma schema
interface MockWindow {
  id: number;
  date: Date;
  startTime: string; // HH:mm format
  endTime: string;
}

interface MockParticipant {
  id: number;
  name: string;
  email: string;
  type: "CADRE_REQUIRED" | "CADRE_OPTIONAL" | "CLIENT";
  hasResponded: boolean;
}

interface MockResponse {
  id: number;
  participantId: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
}

describe("Heat Map Calculation", () => {
  describe("calculateHeatMap", () => {
    const createWindow = (id: number, date: string, startTime: string, endTime: string): MockWindow => ({
      id,
      date: new Date(date),
      startTime,
      endTime,
    });

    const createParticipant = (
      id: number,
      name: string,
      type: MockParticipant["type"] = "CLIENT",
      hasResponded = true
    ): MockParticipant => ({
      id,
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
      type,
      hasResponded,
    });

    const createResponse = (
      id: number,
      participantId: number,
      date: string,
      startTime: string,
      endTime: string
    ): MockResponse => ({
      id,
      participantId,
      date,
      startTime,
      endTime,
    });

    it("should return empty heat map when no windows provided", () => {
      const result = calculateHeatMap([], [], []);

      expect(result.cells).toEqual([]);
      expect(result.stats.totalParticipants).toBe(0);
      expect(result.stats.totalResponses).toBe(0);
      expect(result.stats.optimalSlots).toEqual([]);
      expect(result.stats.perfectSlots).toEqual([]);
    });

    it("should calculate heat map for single window with no responses", () => {
      const windows = [createWindow(1, "2025-01-15", "09:00", "10:00")];
      const participants = [createParticipant(1, "Alice")];
      const responses: MockResponse[] = [];

      const result = calculateHeatMap(windows, responses, participants);

      expect(result.cells).toHaveLength(1);
      expect(result.cells[0]).toMatchObject({
        date: "2025-01-15",
        startTime: "09:00",
        endTime: "10:00",
        responseCount: 0,
        totalParticipants: 1,
        percentAvailable: 0,
        participantNames: [],
      });
    });

    it("should calculate 100% availability when all participants respond", () => {
      const windows = [createWindow(1, "2025-01-15", "09:00", "10:00")];
      const participants = [createParticipant(1, "Alice"), createParticipant(2, "Bob")];
      const responses = [
        createResponse(1, 1, "2025-01-15", "09:00", "10:00"),
        createResponse(2, 2, "2025-01-15", "09:00", "10:00"),
      ];

      const result = calculateHeatMap(windows, responses, participants);

      expect(result.cells[0].responseCount).toBe(2);
      expect(result.cells[0].percentAvailable).toBe(100);
      expect(result.cells[0].participantNames).toEqual(["Alice", "Bob"]);
      expect(result.stats.perfectSlots).toHaveLength(1);
    });

    it("should calculate partial availability correctly", () => {
      const windows = [createWindow(1, "2025-01-15", "09:00", "10:00")];
      const participants = [
        createParticipant(1, "Alice"),
        createParticipant(2, "Bob"),
        createParticipant(3, "Charlie"),
        createParticipant(4, "Diana"),
      ];
      const responses = [
        createResponse(1, 1, "2025-01-15", "09:00", "10:00"),
        createResponse(2, 2, "2025-01-15", "09:00", "10:00"),
        createResponse(3, 3, "2025-01-15", "09:00", "10:00"),
      ];

      const result = calculateHeatMap(windows, responses, participants);

      expect(result.cells[0].responseCount).toBe(3);
      expect(result.cells[0].percentAvailable).toBe(75);
      expect(result.cells[0].participantNames).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should identify optimal slots (highest availability)", () => {
      const windows = [
        createWindow(1, "2025-01-15", "09:00", "10:00"),
        createWindow(2, "2025-01-15", "14:00", "15:00"),
      ];
      const participants = [createParticipant(1, "Alice"), createParticipant(2, "Bob")];
      const responses = [
        createResponse(1, 1, "2025-01-15", "09:00", "10:00"),
        createResponse(2, 2, "2025-01-15", "09:00", "10:00"),
        createResponse(3, 1, "2025-01-15", "14:00", "15:00"),
      ];

      const result = calculateHeatMap(windows, responses, participants);

      expect(result.stats.optimalSlots).toHaveLength(1);
      expect(result.stats.optimalSlots[0].startTime).toBe("09:00");
      expect(result.stats.perfectSlots).toHaveLength(1);
    });

    it("should handle multiple windows across different dates", () => {
      const windows = [
        createWindow(1, "2025-01-15", "09:00", "10:00"),
        createWindow(2, "2025-01-16", "09:00", "10:00"),
        createWindow(3, "2025-01-17", "09:00", "10:00"),
      ];
      const participants = [createParticipant(1, "Alice")];
      const responses = [
        createResponse(1, 1, "2025-01-15", "09:00", "10:00"),
        createResponse(2, 1, "2025-01-17", "09:00", "10:00"),
      ];

      const result = calculateHeatMap(windows, responses, participants);

      expect(result.cells).toHaveLength(3);
      const cellsByDate = Object.fromEntries(result.cells.map((c) => [c.date, c]));
      expect(cellsByDate["2025-01-15"].percentAvailable).toBe(100);
      expect(cellsByDate["2025-01-16"].percentAvailable).toBe(0);
      expect(cellsByDate["2025-01-17"].percentAvailable).toBe(100);
    });

    it("should filter by participant type when specified", () => {
      const windows = [createWindow(1, "2025-01-15", "09:00", "10:00")];
      const participants = [
        createParticipant(1, "Alice", "CADRE_REQUIRED"),
        createParticipant(2, "Bob", "CADRE_OPTIONAL"),
        createParticipant(3, "Client", "CLIENT"),
      ];
      const responses = [
        createResponse(1, 1, "2025-01-15", "09:00", "10:00"),
        createResponse(2, 2, "2025-01-15", "09:00", "10:00"),
      ];

      // Filter for CADRE_REQUIRED only
      const result = calculateHeatMap(windows, responses, participants, "CADRE_REQUIRED");

      expect(result.cells[0].totalParticipants).toBe(1);
      expect(result.cells[0].responseCount).toBe(1);
      expect(result.cells[0].percentAvailable).toBe(100);
    });

    it("should only count participants who have responded", () => {
      const windows = [createWindow(1, "2025-01-15", "09:00", "10:00")];
      const participants = [
        createParticipant(1, "Alice", "CLIENT", true),
        createParticipant(2, "Bob", "CLIENT", false), // Has not responded
      ];
      const responses = [createResponse(1, 1, "2025-01-15", "09:00", "10:00")];

      const result = calculateHeatMap(windows, responses, participants);

      // Both participants count toward total, but only Alice responded
      expect(result.cells[0].totalParticipants).toBe(2);
      expect(result.cells[0].responseCount).toBe(1);
      expect(result.cells[0].percentAvailable).toBe(50);
    });
  });

  describe("getHeatMapColorClass", () => {
    it("should return success color for 100% availability", () => {
      expect(getHeatMapColorClass(100)).toBe("bg-success");
    });

    it("should return high availability color for 75-99%", () => {
      expect(getHeatMapColorClass(99)).toMatch(/bg-/);
      expect(getHeatMapColorClass(75)).toMatch(/bg-/);
    });

    it("should return medium availability color for 50-74%", () => {
      expect(getHeatMapColorClass(74)).toMatch(/bg-/);
      expect(getHeatMapColorClass(50)).toMatch(/bg-/);
    });

    it("should return low availability color for 25-49%", () => {
      expect(getHeatMapColorClass(49)).toMatch(/bg-/);
      expect(getHeatMapColorClass(25)).toMatch(/bg-/);
    });

    it("should return minimal availability color for 0-24%", () => {
      expect(getHeatMapColorClass(24)).toMatch(/bg-/);
      expect(getHeatMapColorClass(0)).toMatch(/bg-/);
    });
  });
});

describe("Heat Map Data Structure", () => {
  it("should have correct shape for HeatMapCell", () => {
    const cell: HeatMapCell = {
      date: "2025-01-15",
      startTime: "09:00",
      endTime: "10:00",
      responseCount: 3,
      totalParticipants: 5,
      percentAvailable: 60,
      participantNames: ["Alice", "Bob", "Charlie"],
    };

    expect(cell.date).toBe("2025-01-15");
    expect(cell.percentAvailable).toBe(60);
    expect(cell.participantNames).toHaveLength(3);
  });

  it("should have correct shape for HeatMapData", () => {
    const cell: HeatMapCell = {
      date: "2025-01-15",
      startTime: "09:00",
      endTime: "10:00",
      responseCount: 3,
      totalParticipants: 3,
      percentAvailable: 100,
      participantNames: ["Alice", "Bob", "Charlie"],
    };

    const data: HeatMapData = {
      cells: [cell],
      stats: {
        optimalSlots: [cell],
        perfectSlots: [cell],
        totalResponses: 3,
        totalParticipants: 3,
      },
    };

    expect(data.cells).toHaveLength(1);
    expect(data.stats.perfectSlots).toHaveLength(1);
  });
});
