"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { HeatMapCell as HeatMapCellData } from "@calcom/features/group-polls";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import { HeatMap, ShareDialog } from "../components";

interface GroupPollsDetailViewProps {
  pollId: number;
}

// Helper to safely format dates - parses YYYY-MM-DD as local date (not UTC)
const formatDate = (date: unknown, options?: Intl.DateTimeFormatOptions): string => {
  try {
    if (!date) return "N/A";
    // Convert to YYYY-MM-DD string first
    const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : String(date);
    // Parse YYYY-MM-DD as local date, not UTC
    // new Date("2025-12-01") interprets as UTC midnight, causing off-by-one in local timezone
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day); // Local midnight
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString(undefined, options);
  } catch {
    return "Invalid date";
  }
};

// Ensure value is a renderable string
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Helper to get unique cell key for heat map selection
function getCellKey(cell: HeatMapCellData): string {
  return `${cell.date}-${cell.startTime}-${cell.endTime}`;
}

export default function GroupPollsDetailView({ pollId }: GroupPollsDetailViewProps) {
  const { t: _t } = useLocale();
  const router = useRouter();
  void _t; // For future i18n use
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<HeatMapCellData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { data: poll, isLoading, error, refetch } = trpc.viewer.groupPolls.get.useQuery({ id: pollId });

  const deleteMutation = trpc.viewer.groupPolls.delete.useMutation({
    onSuccess: () => {
      showToast("Poll deleted successfully", "success");
      router.push("/group-polls");
    },
    onError: (error) => {
      showToast(error.message || "Failed to delete poll", "error");
    },
  });

  const bookMutation = trpc.viewer.groupPolls.book.useMutation({
    onSuccess: () => {
      showToast("Booking created successfully!", "success");
      setShowConfirmDialog(false);
      setSelectedSlot(null);
      refetch();
    },
    onError: (error) => {
      showToast(error.message || "Failed to create booking", "error");
    },
  });

  // Calculate unavailable participants when a slot is selected
  const getUnavailableParticipants = () => {
    if (!selectedSlot || !poll) return [];
    const availableNames = new Set(selectedSlot.participantNames);
    return poll.participants.filter(
      (p: { name: string }) => !availableNames.has(p.name)
    );
  };

  const handleBookSlot = () => {
    if (!selectedSlot || !poll) return;
    bookMutation.mutate({
      pollId: poll.id,
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  const copyToClipboard = async (accessToken: string, participantName: string) => {
    const url = `${window.location.origin}/p/${accessToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(accessToken);
    showToast(`Link copied for ${participantName}`, "success");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-subtle">Loading poll...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-error mb-4">Failed to load poll</div>
        <Button onClick={() => router.push("/group-polls")}>Back to Polls</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Poll Info */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-emphasis text-xl font-semibold">{safeString(poll.title)}</h2>
            {poll.description && <p className="text-subtle mt-1">{safeString(poll.description)}</p>}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              poll.status === "ACTIVE"
                ? "bg-success text-success"
                : poll.status === "CLOSED"
                ? "bg-subtle text-subtle"
                : "bg-attention text-attention"
            }`}>
            {safeString(poll.status)}
          </span>
        </div>

        <div className="text-subtle grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="font-medium">Duration:</span> {poll.durationMinutes} minutes
          </div>
          <div>
            <span className="font-medium">Date Range:</span>{" "}
            {formatDate(poll.dateRangeStart)} - {formatDate(poll.dateRangeEnd)}
          </div>
          <div>
            <span className="font-medium">Created:</span> {formatDate(poll.createdAt)}
          </div>
          <div>
            <span className="font-medium">Responses:</span>{" "}
            {poll.participants.filter((p: { hasResponded: boolean }) => p.hasResponded).length} / {poll.participants.length}
          </div>
        </div>

        {/* Event Type Info */}
        {poll.eventType && (
          <div className="mt-4 border-t border-subtle pt-4">
            <span className="text-subtle text-sm">
              <span className="font-medium">Event Type:</span> {poll.eventType.title} ({poll.eventType.length} min)
            </span>
          </div>
        )}

        {/* Booked Status */}
        {poll.booking && poll.selectedDate && (
          <div className="mt-4 rounded-md bg-success p-4 text-success">
            <div className="font-medium">Booking Created!</div>
            <div className="text-sm">
              Scheduled for {formatDate(poll.selectedDate, { weekday: "long", month: "long", day: "numeric" })}{" "}
              at {poll.selectedStartTime} - {poll.selectedEndTime}
            </div>
            <Button
              color="secondary"
              size="sm"
              className="mt-2"
              onClick={() => router.push(`/bookings/${poll.booking?.uid}`)}>
              View Booking
            </Button>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <h3 className="text-emphasis mb-4 text-lg font-medium">Participants</h3>
        <div className="space-y-3">
          {poll.participants.map((participant: { id: number; name: string; email: string; type: string; hasResponded: boolean; accessToken: string }) => (
            <div
              key={participant.id}
              className="border-subtle flex items-center justify-between rounded-md border p-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-emphasis font-medium">{safeString(participant.name)}</div>
                  <div className="text-subtle text-sm">{safeString(participant.email)}</div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    participant.type === "CADRE_REQUIRED"
                      ? "bg-emphasis text-emphasis"
                      : participant.type === "CADRE_OPTIONAL"
                      ? "bg-subtle text-subtle"
                      : "bg-info text-info"
                  }`}>
                  {safeString(participant.type).replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {participant.hasResponded ? (
                  <span className="text-success text-sm">Responded</span>
                ) : (
                  <span className="text-subtle text-sm">Pending</span>
                )}
                <Button
                  color="secondary"
                  size="sm"
                  data-testid="copy-link-button"
                  onClick={() => copyToClipboard(participant.accessToken, participant.name)}>
                  {copiedToken === participant.accessToken ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Availability Heat Map */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <h3 className="text-emphasis mb-4 text-lg font-medium">
          {poll.booking ? "Availability Overview" : "Select a Time Slot"}
        </h3>
        {poll.heatMap ? (
          <HeatMap
            data={poll.heatMap}
            showParticipantNames={true}
            selectable={!poll.booking && poll.status !== "BOOKED"}
            selectedSlots={selectedSlot ? new Set([getCellKey(selectedSlot)]) : undefined}
            onSlotSelect={setSelectedSlot}
          />
        ) : (
          <div className="text-subtle text-sm">No availability data yet.</div>
        )}
      </div>

      {/* Selected Slot Detail Panel */}
      {selectedSlot && !poll.booking && (
        <div className="border-subtle bg-default rounded-md border p-6">
          <h3 className="text-emphasis mb-4 text-lg font-medium">
            Selected: {formatDate(selectedSlot.date, { weekday: "short", month: "short", day: "numeric" })}{" "}
            {selectedSlot.startTime} - {selectedSlot.endTime}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Available Participants */}
            <div>
              <h4 className="text-success mb-2 font-medium">
                Available ({selectedSlot.responseCount})
              </h4>
              <div className="space-y-1">
                {selectedSlot.participantNames.map((name) => (
                  <div key={name} className="text-sm">
                    <span className="text-success">✓</span> {name}
                  </div>
                ))}
                {selectedSlot.participantNames.length === 0 && (
                  <div className="text-subtle text-sm">No one available at this time</div>
                )}
              </div>
            </div>

            {/* Unavailable Participants */}
            <div>
              <h4 className="text-subtle mb-2 font-medium">
                Unavailable ({getUnavailableParticipants().length})
              </h4>
              <div className="space-y-1">
                {getUnavailableParticipants().map((p: { id: number; name: string }) => (
                  <div key={p.id} className="text-subtle text-sm">
                    <span className="text-muted">✗</span> {p.name}
                  </div>
                ))}
                {getUnavailableParticipants().length === 0 && (
                  <div className="text-success text-sm">Everyone is available!</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!poll.eventType}
                  onClick={() => setShowConfirmDialog(true)}>
                  Schedule This Time
                </Button>
              </DialogTrigger>
              <ConfirmationDialogContent
                title="Create Booking"
                confirmBtnText="Create Booking"
                onConfirm={handleBookSlot}
                isPending={bookMutation.isPending}>
                <div className="space-y-4">
                  <p>
                    You are about to create a booking for <strong>{poll.eventType?.title}</strong>.
                  </p>
                  <div>
                    <strong>Time:</strong> {formatDate(selectedSlot.date, { weekday: "long", month: "long", day: "numeric" })}{" "}
                    at {selectedSlot.startTime} - {selectedSlot.endTime}
                  </div>
                  <div>
                    <strong>Invitees ({selectedSlot.participantNames.length}):</strong>
                    <ul className="mt-1 list-inside list-disc">
                      {selectedSlot.participantNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                  {getUnavailableParticipants().length > 0 && (
                    <div className="text-subtle">
                      <strong>Not invited ({getUnavailableParticipants().length}):</strong>
                      <ul className="mt-1 list-inside list-disc">
                        {getUnavailableParticipants().map((p: { id: number; name: string }) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ConfirmationDialogContent>
            </Dialog>
            <Button color="secondary" onClick={() => setSelectedSlot(null)}>
              Cancel
            </Button>
          </div>

          {!poll.eventType && (
            <p className="text-attention mt-4 text-sm">
              This poll is not linked to an event type. Cannot create booking.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          color="secondary"
          data-testid="share-poll-button"
          onClick={() => setShowShareDialog(true)}>
          Share Poll
        </Button>
        <Button
          color="destructive"
          data-testid="delete-poll-button"
          onClick={() => deleteMutation.mutate({ id: pollId })}
          loading={deleteMutation.isPending}>
          Delete Poll
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        pollTitle={poll.title}
        shareSlug={poll.shareSlug}
      />
    </div>
  );
}
