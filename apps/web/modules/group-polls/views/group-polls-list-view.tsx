"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

type GroupPoll = RouterOutputs["viewer"]["groupPolls"]["list"][number];

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success">Active</Badge>;
    case "BOOKED":
      return <Badge variant="blue">Booked</Badge>;
    case "CLOSED":
      return <Badge variant="gray">Closed</Badge>;
    case "EXPIRED":
      return <Badge variant="orange">Expired</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

function PollListItem({ poll, onDelete }: { poll: GroupPoll; onDelete: () => void }) {
  const router = useRouter();
  const { copyToClipboard, isCopied } = useCopy();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const shareUrl = `${window.location.origin}/p/${poll.shareSlug}`;

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
    showToast("Link copied to clipboard", "success");
  };

  const deleteMutation = trpc.viewer.groupPolls.delete.useMutation({
    onSuccess: () => {
      showToast("Poll deleted", "success");
      onDelete();
    },
    onError: (error) => {
      showToast(error.message || "Failed to delete poll", "error");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: poll.id });
  };

  return (
    <>
      <div className="border-subtle hover:bg-muted flex items-center justify-between border-b p-4 last:border-b-0">
        <div className="flex-1">
          <Link
            href={`/group-polls/${poll.id}`}
            className="text-emphasis hover:text-default font-medium transition-colors">
            {poll.title}
          </Link>
          <div className="text-subtle mt-1 flex items-center gap-3 text-sm">
            <span>
              {formatDate(poll.dateRangeStart)} - {formatDate(poll.dateRangeEnd)}
            </span>
            <span className="text-muted">|</span>
            <span>{poll.durationMinutes} min</span>
            <span className="text-muted">|</span>
            <span>
              {poll.participantCount} participant{poll.participantCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(poll.status)}

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button variant="icon" color="secondary" StartIcon="ellipsis" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  StartIcon="eye"
                  onClick={() => router.push(`/group-polls/${poll.id}`)}>
                  View Details
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropdownItem type="button" StartIcon="link" onClick={handleCopyLink}>
                  {isCopied ? "Copied!" : "Copy Link"}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  StartIcon="external-link"
                  onClick={() => window.open(shareUrl, "_blank")}>
                  Open Poll Page
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="trash-2"
                  onClick={() => setDeleteDialogOpen(true)}>
                  Delete
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title="Delete Poll"
          confirmBtnText="Delete"
          onConfirm={handleDelete}>
          Are you sure you want to delete &quot;{poll.title}&quot;? This action cannot be undone.
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}

export function GroupPollsCTA() {
  return (
    <Link href="/group-polls/new">
      <Button StartIcon="plus">New Poll</Button>
    </Link>
  );
}

export default function GroupPollsListView() {
  const { t: _t } = useLocale();
  void _t; // For future i18n use
  const { data: polls, isLoading, refetch } = trpc.viewer.groupPolls.list.useQuery();

  if (isLoading) {
    return (
      <div className="divide-subtle border-subtle mb-16 overflow-hidden rounded-md border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-subtle flex items-center justify-between border-b p-4 last:border-b-0">
            <div className="flex-1">
              <SkeletonText className="mb-2 h-5 w-48" />
              <SkeletonText className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonText className="h-6 w-20" />
              <SkeletonText className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!polls || polls.length === 0) {
    return (
      <EmptyScreen
        Icon="users"
        headline="No group polls yet"
        description="Create your first group poll to find the best time to meet with multiple people."
        buttonRaw={
          <Link href="/group-polls/new">
            <Button StartIcon="plus">Create Poll</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="divide-subtle border-subtle mb-16 overflow-hidden rounded-md border">
      {polls.map((poll) => (
        <PollListItem key={poll.id} poll={poll} onDelete={() => refetch()} />
      ))}
    </div>
  );
}
