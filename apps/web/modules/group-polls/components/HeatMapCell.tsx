"use client";

import { Tooltip } from "@calcom/ui/components/tooltip";
import { getHeatMapColorClass, type HeatMapCell as HeatMapCellData } from "@calcom/features/group-polls";

interface HeatMapCellProps {
  cell: HeatMapCellData;
  showParticipantNames?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function HeatMapCell({ cell, showParticipantNames, isSelected, onClick }: HeatMapCellProps) {
  const colorClass = getHeatMapColorClass(cell.percentAvailable);
  const tooltipContent =
    showParticipantNames && cell.participantNames.length > 0
      ? cell.participantNames.join(", ")
      : `${cell.responseCount}/${cell.totalParticipants} available`;

  // Build accessible label for screen readers
  const ariaLabel = isSelected
    ? `Time slot ${cell.startTime} to ${cell.endTime}, ${cell.responseCount} of ${cell.totalParticipants} available, selected`
    : `Time slot ${cell.startTime} to ${cell.endTime}, ${cell.responseCount} of ${cell.totalParticipants} available`;

  const cellContent = (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      data-testid="time-slot-button"
      className={`min-h-[60px] w-full rounded-md p-2 text-center transition-all ${colorClass}
        ${isSelected ? "ring-2 ring-emphasis ring-offset-2" : ""}
        ${onClick ? "cursor-pointer hover:ring-1 hover:ring-subtle" : "cursor-default"}
      `}
    >
      <div className="text-xs font-medium text-default">
        {cell.startTime} - {cell.endTime}
      </div>
      <div className="text-sm font-bold text-emphasis">
        {cell.responseCount}/{cell.totalParticipants}
      </div>
    </button>
  );

  return <Tooltip content={tooltipContent}>{cellContent}</Tooltip>;
}
