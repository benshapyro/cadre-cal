"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import type { HeatMapCell } from "@calcom/features/group-polls";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { TextField, EmailField } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import { HeatMap } from "../components";

type PollWindow = RouterOutputs["viewer"]["public"]["getPollByToken"]["poll"]["windows"][number];

interface PollResponseViewProps {
  accessToken: string;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

// Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one day bug
function formatDate(date: Date | string): string {
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : String(date);
  // Parse YYYY-MM-DD as local date, not UTC
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day); // Local midnight
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  // Time is already in HH:mm format, convert to 12-hour display
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getSlotKey(date: string, startTime: string, endTime: string): string {
  // Date is already in YYYY-MM-DD format, no need to convert via Date object
  return `${date}-${startTime}-${endTime}`;
}

export default function PollResponseView({ accessToken }: PollResponseViewProps) {
  const { t: _t } = useLocale();
  const _router = useRouter();
  void _t; // For future i18n use

  const { data, isLoading, error } = trpc.viewer.public.getPollByToken.useQuery(
    { accessToken },
    { retry: false }
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize form with existing data
  useMemo(() => {
    if (data && !hasInitialized) {
      setName(data.participant.name || "");
      setEmail(data.participant.email || "");

      // Pre-select previously submitted responses
      if (data.participant.responses && data.participant.responses.length > 0) {
        const existingSlots = new Set<string>();
        data.participant.responses.forEach((r) => {
          existingSlots.add(getSlotKey(r.date, r.startTime, r.endTime));
        });
        setSelectedSlots(existingSlots);
      }
      setHasInitialized(true);
    }
  }, [data, hasInitialized]);

  const submitMutation = trpc.viewer.public.submitPollResponse.useMutation({
    onSuccess: () => {
      showToast("Your availability has been submitted!", "success");
    },
    onError: (error) => {
      showToast(error.message || "Failed to submit availability", "error");
    },
  });

  const toggleSlot = (slotKey: string) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotKey)) {
      newSelected.delete(slotKey);
    } else {
      newSelected.add(slotKey);
    }
    setSelectedSlots(newSelected);
  };

  const handleHeatMapSlotSelect = (cell: HeatMapCell) => {
    const slotKey = `${cell.date}-${cell.startTime}-${cell.endTime}`;
    toggleSlot(slotKey);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast("Please enter your name", "error");
      return;
    }
    if (!email.trim()) {
      showToast("Please enter your email", "error");
      return;
    }

    const availability: TimeSlot[] = [];
    selectedSlots.forEach((slotKey) => {
      // slotKey format: YYYY-MM-DD-HH:mm-HH:mm (dates use - but times use :)
      // Split on - but reassemble date parts
      const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (match) {
        availability.push({
          date: match[1],
          startTime: match[2],
          endTime: match[3],
        });
      }
    });

    submitMutation.mutate({
      accessToken,
      name,
      email,
      availability,
    });
  };

  // Group windows by date
  const windowsByDate = useMemo(() => {
    if (!data?.poll.windows) return new Map<string, PollWindow[]>();

    const grouped = new Map<string, PollWindow[]>();
    data.poll.windows.forEach((window) => {
      const dateKey = new Date(window.date).toISOString().split("T")[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(window);
    });
    return grouped;
  }, [data?.poll.windows]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="border-subtle bg-default rounded-lg border p-6">
          <SkeletonText className="mb-2 h-8 w-64" />
          <SkeletonText className="mb-6 h-4 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonText key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="border-subtle bg-default rounded-lg border p-6 text-center">
          <h1 className="text-emphasis mb-2 text-xl font-semibold">Poll Not Found</h1>
          <p className="text-subtle">
            This poll link is invalid or has expired. Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { poll, participant } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
        <div className="mb-4">
          <h1 className="text-emphasis text-2xl font-semibold">{poll.title}</h1>
          {poll.description && <p className="text-subtle mt-1">{poll.description}</p>}
        </div>

        <div className="text-subtle flex flex-wrap gap-4 text-sm">
          <span>{poll.durationMinutes} minutes</span>
          <span>|</span>
          <span>
            {poll.respondedCount} of {poll.participantCount} responded
          </span>
        </div>
      </div>

      <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
        <h2 className="text-emphasis mb-4 text-lg font-medium">Your Information</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <EmailField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
        <h2 className="text-emphasis mb-4 text-lg font-medium">Select Available Times</h2>
        <p className="text-subtle mb-4 text-sm">
          Click on the time slots that work for you. Colors show how many others are available.
        </p>

        {data.heatMap ? (
          <HeatMap
            data={data.heatMap}
            showParticipantNames={false}
            selectable={true}
            selectedSlots={selectedSlots}
            onSlotSelect={handleHeatMapSlotSelect}
          />
        ) : (
          <div className="space-y-4">
            {Array.from(windowsByDate.entries()).map(([dateKey, windows]) => (
              <div key={dateKey} className="border-subtle rounded-md border p-4">
                <h3 className="text-emphasis mb-3 font-medium">{formatDate(dateKey)}</h3>
                <div className="flex flex-wrap gap-2">
                  {windows.map((window) => {
                    const slotKey = getSlotKey(window.date, window.startTime, window.endTime);
                    const isSelected = selectedSlots.has(slotKey);

                    return (
                      <button
                        key={window.id}
                        type="button"
                        data-testid="time-slot-button"
                        onClick={() => toggleSlot(slotKey)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? "border-inverted bg-inverted text-inverted"
                            : "border-subtle bg-default text-default hover:bg-subtle"
                        }`}>
                        {formatTime(window.startTime)} - {formatTime(window.endTime)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {windowsByDate.size === 0 && !data.heatMap && (
          <p className="text-subtle text-center">No time slots available for this poll.</p>
        )}
      </div>

      <div className="flex justify-between">
        <div className="text-subtle text-sm">
          {selectedSlots.size} time slot{selectedSlots.size !== 1 ? "s" : ""} selected
        </div>
        <Button onClick={handleSubmit} loading={submitMutation.isPending}>
          {participant.hasResponded ? "Update Availability" : "Submit Availability"}
        </Button>
      </div>

      {participant.hasResponded && (
        <div className="mt-4 text-center">
          <Badge variant="success" data-testid="already-responded-badge">
            You have already responded to this poll
          </Badge>
        </div>
      )}
    </div>
  );
}

