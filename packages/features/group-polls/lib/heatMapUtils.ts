/**
 * Heat Map Utility Functions for Group Polls
 *
 * Provides shared functions for preparing data and processing heat maps
 * across different handlers (viewer and public endpoints).
 */

import { calculateHeatMap, type HeatMapData, type ParticipantType } from "./heatMapCalculation";
import { formatTime, formatDateISO } from "./timeUtils";

/**
 * Raw poll window from Prisma query
 */
export interface RawPollWindow {
  id: number;
  date: Date;
  startTime: Date;
  endTime: Date;
}

/**
 * Raw poll response from Prisma query
 */
export interface RawPollResponse {
  id: number;
  date: Date;
  startTime: Date;
  endTime: Date;
}

/**
 * Raw poll participant with responses from Prisma query
 */
export interface RawPollParticipant {
  id: number;
  name: string;
  type: string;
  hasResponded: boolean;
  responses: RawPollResponse[];
}

/**
 * Formatted window ready for heat map calculation
 */
interface FormattedWindow {
  id: number;
  date: Date;
  startTime: string;
  endTime: string;
}

/**
 * Formatted response ready for heat map calculation
 */
interface FormattedResponse {
  id: number;
  participantId: number;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Formatted participant ready for heat map calculation
 */
interface FormattedParticipant {
  id: number;
  name: string;
  type: ParticipantType;
  hasResponded: boolean;
}

/**
 * Result of preparing heat map data
 */
export interface PreparedHeatMapData {
  formattedWindows: FormattedWindow[];
  allResponses: FormattedResponse[];
  formattedParticipants: FormattedParticipant[];
}

/**
 * Transform raw poll data from Prisma into format needed for heat map calculation.
 * Handles Date->string conversions for times and dates.
 *
 * @param windows - Raw poll windows from Prisma
 * @param participants - Raw participants with responses from Prisma
 * @returns Formatted data ready for calculateHeatMap
 */
export function prepareHeatMapData(
  windows: RawPollWindow[],
  participants: RawPollParticipant[]
): PreparedHeatMapData {
  const formattedWindows = windows.map((w) => ({
    id: w.id,
    date: w.date,
    startTime: formatTime(w.startTime),
    endTime: formatTime(w.endTime),
  }));

  const allResponses = participants.flatMap((p) =>
    p.responses.map((r) => ({
      id: r.id,
      participantId: p.id,
      date: formatDateISO(r.date),
      startTime: formatTime(r.startTime),
      endTime: formatTime(r.endTime),
    }))
  );

  const formattedParticipants = participants.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as ParticipantType,
    hasResponded: p.hasResponded,
  }));

  return { formattedWindows, allResponses, formattedParticipants };
}

/**
 * Remove participant names from heat map for privacy (used in public endpoints).
 * Creates a new object without mutating the original.
 *
 * @param heatMap - Heat map data with participant names
 * @returns Heat map with all participantNames arrays emptied
 */
export function anonymizeHeatMap(heatMap: HeatMapData): HeatMapData {
  return {
    ...heatMap,
    cells: heatMap.cells.map((c) => ({ ...c, participantNames: [] })),
    stats: {
      ...heatMap.stats,
      optimalSlots: heatMap.stats.optimalSlots.map((s) => ({ ...s, participantNames: [] })),
      perfectSlots: heatMap.stats.perfectSlots.map((s) => ({ ...s, participantNames: [] })),
    },
  };
}

/**
 * Result of calculating both heat maps
 */
export interface BothHeatMaps {
  heatMap: HeatMapData;
  heatMapRequired: HeatMapData;
}

/**
 * Calculate both regular heat map (all participants) and required-only heat map.
 * Used by the organizer view to show both perspectives.
 *
 * @param windows - Raw poll windows from Prisma
 * @param participants - Raw participants with responses from Prisma
 * @returns Both heat maps
 */
export function calculateBothHeatMaps(
  windows: RawPollWindow[],
  participants: RawPollParticipant[]
): BothHeatMaps {
  const { formattedWindows, allResponses, formattedParticipants } = prepareHeatMapData(
    windows,
    participants
  );

  const heatMap = calculateHeatMap(formattedWindows, allResponses, formattedParticipants);
  const heatMapRequired = calculateHeatMap(
    formattedWindows,
    allResponses,
    formattedParticipants,
    "CADRE_REQUIRED"
  );

  return { heatMap, heatMapRequired };
}

/**
 * Calculate heat map and anonymize it in one step.
 * Used by public endpoints that shouldn't expose participant names.
 *
 * @param windows - Raw poll windows from Prisma
 * @param participants - Raw participants with responses from Prisma
 * @returns Anonymized heat map
 */
export function calculateAnonymousHeatMap(
  windows: RawPollWindow[],
  participants: RawPollParticipant[]
): HeatMapData {
  const { formattedWindows, allResponses, formattedParticipants } = prepareHeatMapData(
    windows,
    participants
  );

  const heatMap = calculateHeatMap(formattedWindows, allResponses, formattedParticipants);
  return anonymizeHeatMap(heatMap);
}
