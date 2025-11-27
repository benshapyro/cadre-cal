"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

interface GroupPollsDetailViewProps {
  pollId: number;
}

// Helper to safely format dates - converts to string first
const formatDate = (date: unknown, options?: Intl.DateTimeFormatOptions): string => {
  try {
    if (!date) return "N/A";
    // Convert to string first if it's a Date object
    const dateStr = date instanceof Date ? date.toISOString() : String(date);
    const d = new Date(dateStr);
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

export default function GroupPollsDetailView({ pollId }: GroupPollsDetailViewProps) {
  const { t: _t } = useLocale();
  const router = useRouter();
  void _t; // For future i18n use
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: poll, isLoading, error } = trpc.viewer.groupPolls.get.useQuery({ id: pollId });

  const deleteMutation = trpc.viewer.groupPolls.delete.useMutation({
    onSuccess: () => {
      showToast("Poll deleted successfully", "success");
      router.push("/group-polls");
    },
    onError: (error) => {
      showToast(error.message || "Failed to delete poll", "error");
    },
  });

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
              poll.status === "OPEN"
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
                  onClick={() => copyToClipboard(participant.accessToken, participant.name)}>
                  {copiedToken === participant.accessToken ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Windows */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <h3 className="text-emphasis mb-4 text-lg font-medium">Time Windows</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {poll.windows.map((window: { id: number; date: unknown; startTime: string; endTime: string }) => (
            <div key={window.id} className="border-subtle rounded border p-3 text-center">
              <div className="text-emphasis font-medium">
                {formatDate(window.date, { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="text-subtle text-sm">
                {safeString(window.startTime)} - {safeString(window.endTime)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button color="destructive" onClick={() => deleteMutation.mutate({ id: pollId })} loading={deleteMutation.isPending}>
          Delete Poll
        </Button>
      </div>
    </div>
  );
}
