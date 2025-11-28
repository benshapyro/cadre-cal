/**
 * Heat Map Calculation for Group Polls
 *
 * Aggregates participant responses to calculate availability percentages
 * for each time window, enabling heat map visualization.
 */

export interface HeatMapCell {
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  responseCount: number; // Number of participants who selected this slot
  totalParticipants: number; // Total participants (filtered if applicable)
  percentAvailable: number; // 0-100
  participantNames: string[]; // Names of participants who selected (for tooltips)
}

export interface HeatMapData {
  cells: HeatMapCell[];
  stats: {
    optimalSlots: HeatMapCell[]; // Slots with highest availability
    perfectSlots: HeatMapCell[]; // Slots with 100% availability
    totalResponses: number; // Total number of responses across all slots
    totalParticipants: number; // Total participants considered
  };
}

export type ParticipantType = "CADRE_REQUIRED" | "CADRE_OPTIONAL" | "CLIENT";

interface Window {
  id: number;
  date: Date;
  startTime: string;
  endTime: string;
}

interface Participant {
  id: number;
  name: string;
  type: ParticipantType;
  hasResponded: boolean;
}

interface Response {
  id: number;
  participantId: number;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Generate a unique key for a time slot
 */
function getSlotKey(date: string, startTime: string, endTime: string): string {
  return `${date}-${startTime}-${endTime}`;
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculate heat map data from windows, responses, and participants
 *
 * @param windows - Available time windows for the poll
 * @param responses - Participant responses indicating availability
 * @param participants - All participants in the poll
 * @param filterType - Optional filter to only consider specific participant types
 * @returns HeatMapData with cells and statistics
 */
export function calculateHeatMap(
  windows: Window[],
  responses: Response[],
  participants: Participant[],
  filterType?: ParticipantType
): HeatMapData {
  // Handle empty input
  if (windows.length === 0) {
    return {
      cells: [],
      stats: {
        optimalSlots: [],
        perfectSlots: [],
        totalResponses: 0,
        totalParticipants: 0,
      },
    };
  }

  // Filter participants by type if specified
  const filteredParticipants = filterType
    ? participants.filter((p) => p.type === filterType)
    : participants;

  const totalParticipants = filteredParticipants.length;

  // Build a map of participant IDs to names for filtered participants
  const participantMap = new Map<number, string>();
  filteredParticipants.forEach((p) => {
    participantMap.set(p.id, p.name);
  });

  // Build a map of slot key -> responses
  const responsesBySlot = new Map<string, Response[]>();
  responses.forEach((response) => {
    // Only count responses from filtered participants
    if (!participantMap.has(response.participantId)) {
      return;
    }
    const key = getSlotKey(response.date, response.startTime, response.endTime);
    if (!responsesBySlot.has(key)) {
      responsesBySlot.set(key, []);
    }
    responsesBySlot.get(key)!.push(response);
  });

  // Calculate heat map cells for each window
  const cells: HeatMapCell[] = windows.map((window) => {
    const date = formatDate(window.date);
    const key = getSlotKey(date, window.startTime, window.endTime);
    const slotResponses = responsesBySlot.get(key) || [];

    const responseCount = slotResponses.length;
    const percentAvailable = totalParticipants > 0 ? Math.round((responseCount / totalParticipants) * 100) : 0;

    // Get participant names for this slot
    const participantNames = slotResponses
      .map((r) => participantMap.get(r.participantId))
      .filter((name): name is string => name !== undefined);

    return {
      date,
      startTime: window.startTime,
      endTime: window.endTime,
      responseCount,
      totalParticipants,
      percentAvailable,
      participantNames,
    };
  });

  // Calculate statistics
  let maxAvailability = 0;
  const perfectSlots: HeatMapCell[] = [];
  let totalResponseCount = 0;

  cells.forEach((cell) => {
    totalResponseCount += cell.responseCount;
    if (cell.percentAvailable > maxAvailability) {
      maxAvailability = cell.percentAvailable;
    }
    if (cell.percentAvailable === 100) {
      perfectSlots.push(cell);
    }
  });

  // Find optimal slots (those with the maximum availability)
  const optimalSlots = cells.filter((cell) => cell.percentAvailable === maxAvailability && maxAvailability > 0);

  return {
    cells,
    stats: {
      optimalSlots,
      perfectSlots,
      totalResponses: totalResponseCount,
      totalParticipants,
    },
  };
}

/**
 * Get Tailwind CSS class for heat map cell background based on availability percentage
 *
 * Uses Cal.com's visualization color tokens for consistent theming
 *
 * @param percentage - Availability percentage (0-100)
 * @returns Tailwind CSS class for background color
 */
export function getHeatMapColorClass(percentage: number): string {
  if (percentage === 100) {
    return "bg-success"; // Green - perfect match
  }
  if (percentage >= 75) {
    return "bg-emerald-200 dark:bg-emerald-900"; // High availability
  }
  if (percentage >= 50) {
    return "bg-yellow-200 dark:bg-yellow-900"; // Medium availability
  }
  if (percentage >= 25) {
    return "bg-orange-200 dark:bg-orange-900"; // Low availability
  }
  return "bg-red-100 dark:bg-red-900"; // Minimal availability
}
