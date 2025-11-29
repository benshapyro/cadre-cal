"use client";

import { getHeatMapColorClass } from "@calcom/features/group-polls";

const LEGEND_LEVELS = [
  { percent: 0, label: "0%" },
  { percent: 25, label: "25%" },
  { percent: 50, label: "50%" },
  { percent: 75, label: "75%" },
  { percent: 100, label: "100%" },
];

export function HeatMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-subtle">
      <span className="font-medium">Availability:</span>
      {LEGEND_LEVELS.map(({ percent, label }) => (
        <div key={percent} className="flex items-center gap-1">
          <div className={`h-4 w-4 rounded ${getHeatMapColorClass(percent)}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
