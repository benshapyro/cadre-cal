"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

import { SkeletonText } from "@calcom/ui/components/skeleton";

export function GroupPollsSkeleton() {
  return (
    <ShellMainAppDir heading="Group Polls" subtitle="Create and manage group availability polls">
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
    </ShellMainAppDir>
  );
}
