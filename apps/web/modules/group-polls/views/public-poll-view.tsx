"use client";

import { useState, useMemo } from "react";

import type { HeatMapCell } from "@calcom/features/group-polls";
import { formatDateForDisplay, getSlotKey } from "@calcom/features/group-polls/lib/dateFormatting";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import { HeatMap } from "../components";

type PollData = RouterOutputs["viewer"]["public"]["getPollByShareSlug"];
type _Participant = PollData["participants"][number];

interface PublicPollViewProps {
  shareSlug: string;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface ParticipantOption {
  value: number;
  label: string;
  hasResponded: boolean;
}

export default function PublicPollView({ shareSlug }: PublicPollViewProps) {
  const { t: _t } = useLocale();
  void _t;

  const { data, isLoading, error, refetch } = trpc.viewer.public.getPollByShareSlug.useQuery(
    { shareSlug },
    { retry: false }
  );

  const [selectedParticipants, setSelectedParticipants] = useState<ParticipantOption[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  // Build participant options for multi-select
  const participantOptions = useMemo((): ParticipantOption[] => {
    if (!data?.participants) return [];
    return data.participants.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.email})`,
      hasResponded: p.hasResponded,
    }));
  }, [data?.participants]);

  // When participants are selected, pre-populate with their existing responses
  useMemo(() => {
    if (data && selectedParticipants.length > 0 && !hasInitialized) {
      // Get union of all selected participants' existing responses
      const existingSlots = new Set<string>();
      selectedParticipants.forEach((sp) => {
        const participant = data.participants.find((p) => p.id === sp.value);
        if (participant?.responses) {
          participant.responses.forEach((r) => {
            existingSlots.add(getSlotKey(r.date, r.startTime, r.endTime));
          });
        }
      });
      if (existingSlots.size > 0) {
        setSelectedSlots(existingSlots);
      }
      setHasInitialized(true);
    }
  }, [data, selectedParticipants, hasInitialized]);

  // Reset initialization when participant selection changes
  const handleParticipantChange = (newValue: readonly ParticipantOption[] | null) => {
    setSelectedParticipants(newValue ? [...newValue] : []);
    setHasInitialized(false);
    setSelectedSlots(new Set());
  };

  const submitMutation = trpc.viewer.public.submitMultiPollResponse.useMutation({
    onSuccess: (result) => {
      showToast(`Availability submitted for ${result.updatedParticipantCount} participant(s)!`, "success");
      refetch();
      // Reset selection after successful submit
      setSelectedParticipants([]);
      setSelectedSlots(new Set());
      setHasInitialized(false);
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
    if (selectedParticipants.length === 0) {
      showToast("Please select at least one participant", "error");
      return;
    }

    const availability: TimeSlot[] = [];
    selectedSlots.forEach((slotKey) => {
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
      shareSlug,
      participantIds: selectedParticipants.map((p) => p.value),
      availability,
    });
  };

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

  const { poll, participants } = data;
  const respondedCount = participants.filter((p) => p.hasResponded).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Poll Info */}
      <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
        <div className="mb-4">
          <h1 className="text-emphasis text-2xl font-semibold">{poll.title}</h1>
          {poll.description && <p className="text-subtle mt-1">{poll.description}</p>}
        </div>

        <div className="text-subtle flex flex-wrap gap-4 text-sm">
          <span>{poll.durationMinutes} minutes</span>
          <span>|</span>
          <span>
            {respondedCount} of {participants.length} responded
          </span>
        </div>
      </div>

      {/* Participant Selector */}
      <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
        <h2 className="text-emphasis mb-2 text-lg font-medium">Who are you submitting for?</h2>
        <p className="text-subtle mb-4 text-sm">
          Select one or more participants. You can submit availability on behalf of multiple people.
        </p>
        <Select<ParticipantOption, true>
          isMulti
          isSearchable
          placeholder="Search and select participants..."
          options={participantOptions}
          value={selectedParticipants}
          onChange={handleParticipantChange}
          formatOptionLabel={(option) => (
            <div className="flex items-center justify-between">
              <span>{option.label}</span>
              {option.hasResponded && (
                <Badge variant="success" size="sm">
                  Responded
                </Badge>
              )}
            </div>
          )}
        />

        {selectedParticipants.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedParticipants.map((p) => {
              const participant = participants.find((part) => part.id === p.value);
              return (
                <Badge key={p.value} variant={participant?.hasResponded ? "green" : "gray"}>
                  {participant?.name || p.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Availability Grid - only show when participants are selected */}
      {selectedParticipants.length > 0 && (
        <>
          <div className="border-subtle bg-default mb-6 rounded-lg border p-6">
            <h2 className="text-emphasis mb-4 text-lg font-medium">Select Available Times</h2>
            <p className="text-subtle mb-4 text-sm">
              Click on the time slots when {selectedParticipants.length === 1 ? "this person is" : "these people are"}{" "}
              available. Colors show how many others have indicated availability.
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
                {poll.windows.map((window) => {
                  const slotKey = getSlotKey(
                    new Date(window.date).toISOString().split("T")[0],
                    window.startTime,
                    window.endTime
                  );
                  const isSelected = selectedSlots.has(slotKey);

                  return (
                    <button
                      key={window.id}
                      type="button"
                      onClick={() => toggleSlot(slotKey)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "border-inverted bg-inverted text-inverted"
                          : "border-subtle bg-default text-default hover:bg-subtle"
                      }`}>
                      {formatDateForDisplay(window.date)} {window.startTime} - {window.endTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-between">
            <div className="text-subtle text-sm">
              {selectedSlots.size} time slot{selectedSlots.size !== 1 ? "s" : ""} selected for{" "}
              {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? "s" : ""}
            </div>
            <Button onClick={handleSubmit} loading={submitMutation.isPending}>
              Submit Availability
            </Button>
          </div>
        </>
      )}

      {/* Guidance when no participants selected */}
      {selectedParticipants.length === 0 && (
        <div className="border-subtle bg-muted rounded-lg border p-6 text-center">
          <p className="text-subtle">Select participants above to view and set availability times.</p>
        </div>
      )}
    </div>
  );
}
