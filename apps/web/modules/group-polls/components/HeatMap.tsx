"use client";

import type { HeatMapData, HeatMapCell as HeatMapCellData } from "@calcom/features/group-polls";
import { formatDateForDisplay, getSlotKey } from "@calcom/features/group-polls/lib/dateFormatting";

import { HeatMapCell } from "./HeatMapCell";
import { HeatMapLegend } from "./HeatMapLegend";

interface HeatMapProps {
  data: HeatMapData;
  showParticipantNames?: boolean;
  selectable?: boolean;
  selectedSlots?: Set<string>;
  onSlotSelect?: (cell: HeatMapCellData) => void;
}

/**
 * Get unique key for a heat map cell
 */
function getCellKey(cell: HeatMapCellData): string {
  return getSlotKey(cell.date, cell.startTime, cell.endTime);
}

export function HeatMap({
  data,
  showParticipantNames = false,
  selectable = false,
  selectedSlots,
  onSlotSelect,
}: HeatMapProps) {
  // Group cells by date for grid layout
  const cellsByDate = data.cells.reduce(
    (acc, cell) => {
      if (!acc[cell.date]) {
        acc[cell.date] = [];
      }
      acc[cell.date].push(cell);
      return acc;
    },
    {} as Record<string, HeatMapCellData[]>
  );

  // Sort dates chronologically
  const dates = Object.keys(cellsByDate).sort();

  // Sort time slots within each date
  dates.forEach((date) => {
    cellsByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  if (data.cells.length === 0) {
    return (
      <div className="rounded-md bg-subtle p-4 text-center text-sm text-muted">
        No time slots available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeatMapLegend />

      {/* Perfect slots banner */}
      {data.stats.perfectSlots.length > 0 && (
        <div className="rounded-md bg-success p-3 text-center text-sm text-success">
          {data.stats.perfectSlots.length === 1
            ? "1 perfect time when everyone is available!"
            : `${data.stats.perfectSlots.length} perfect times when everyone is available!`}
        </div>
      )}

      {/* Heat map grid by date */}
      <div className="space-y-4">
        {dates.map((date) => (
          <div key={date}>
            <div className="mb-2 text-sm font-medium text-emphasis">{formatDateForDisplay(date)}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {cellsByDate[date].map((cell) => {
                const cellKey = getCellKey(cell);
                return (
                  <HeatMapCell
                    key={cellKey}
                    cell={cell}
                    showParticipantNames={showParticipantNames}
                    isSelected={selectedSlots?.has(cellKey)}
                    onClick={selectable ? () => onSlotSelect?.(cell) : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stats summary */}
      <div className="text-xs text-muted">
        {data.stats.totalParticipants} participant{data.stats.totalParticipants !== 1 ? "s" : ""} &middot;{" "}
        {data.stats.optimalSlots.length} optimal slot{data.stats.optimalSlots.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
